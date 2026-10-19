const express = require("express");
const router = express.Router();
const { getSheets, getSpreadsheetId } = require("../../config/google");
const { buildSystemDashboard } = require("../dashboard/summarydrug/dashboard.builder");
const { requireAuth, requireBranch } = require("../auth/auth.middleware");
const { getBranchInventoryList } = require("../branchinventorylist/branchinventorylist.service");
const { withSequenceLock } = require("../../utils/running/sequence-lock");
const { getBangkokDateParts } = require("../../utils/running/bangkok-date");
const { maxAnnualSequence, formatAnnualNumber } = require("../../utils/running/annual-number-format");

// Emergency Checklist API requires a valid server-side session.
router.use(requireAuth);

const CHECK_SHEET = "EMERGENCY_CHECK_LOG";
const CHECK_HEADERS = ["CHECK_ID","DATE","TIME","CODE","NAME","REQUIRED","BALANCE","STATUS","USER","REMARK","BRANCH_ID"];

function num(v){ const n=Number(String(v??"").replace(/,/g,"")); return Number.isFinite(n)?n:0; }
function clean(v){ return String(v??"").trim(); }
function parseRows(values){
  if(!values.length) return [];
  const h=values[0].map(x=>clean(x).toUpperCase());
  return values.slice(1).map(row=>Object.fromEntries(h.map((k,i)=>[k,row[i]??""])));
}
async function readRange(range){
  const sheets=await getSheets();
  const r=await sheets.spreadsheets.values.get({spreadsheetId:getSpreadsheetId(),range});
  return r.data.values||[];
}
async function getData(branchId){
  const [m, mv, branchItems]=await Promise.all([
    readRange("INVENTORY_MASTER!A:Z"),
    readRange("INVENTORY_MOVEMENT!A:R"),
    getBranchInventoryList(branchId)
  ]);
  const enabled = new Map(branchItems.filter(item => item.enabled).map(item => [item.code, item]));
  const master = parseRows(m).filter(row => enabled.has(clean(row.CODE).toUpperCase())).map(row => {
    const config = enabled.get(clean(row.CODE).toUpperCase());
    return { ...row, REQUIRED: config ? config.required : num(row.REQUIRED) };
  });
  return {master, movements:parseRows(mv)};
}
async function ensureCheckSheet(){
  const sheets=await getSheets();
  try { await sheets.spreadsheets.values.get({spreadsheetId:getSpreadsheetId(),range:`${CHECK_SHEET}!A1`}); }
  catch(e) {
    await sheets.spreadsheets.batchUpdate({spreadsheetId:getSpreadsheetId(),requestBody:{requests:[{addSheet:{properties:{title:CHECK_SHEET}}}]}});
    await sheets.spreadsheets.values.update({spreadsheetId:getSpreadsheetId(),range:`${CHECK_SHEET}!A1:K1`,valueInputOption:"RAW",requestBody:{values:[CHECK_HEADERS]}});
    return;
  }
  // Add BRANCH_ID at the end only if missing; do not rewrite or infer branches for history.
  const header=await sheets.spreadsheets.values.get({spreadsheetId:getSpreadsheetId(),range:`${CHECK_SHEET}!K1`});
  if(!clean(header.data.values?.[0]?.[0])) await sheets.spreadsheets.values.update({spreadsheetId:getSpreadsheetId(),range:`${CHECK_SHEET}!K1`,valueInputOption:"RAW",requestBody:{values:[["BRANCH_ID"]]}});
}

router.get("/summary", requireBranch, async (req,res)=>{
  try { const d=await getData(req.authBranchId); res.json({success:true,data:buildSystemDashboard(d)}); }
  catch(e){ console.error("EMERGENCY SUMMARY ERROR:",e); res.status(500).json({success:false,message:e.message}); }
});

router.get("/items", requireBranch, async (req,res)=>{
  try { const d=await getData(req.authBranchId); const x=buildSystemDashboard(d); res.json({success:true,data:x.balances,summary:{totalItems:x.totalItems,readyItems:x.readyItems,missingItems:x.missingItems,expiringItems:x.expiringItems,expiredItems:x.expiredItems}}); }
  catch(e){ res.status(500).json({success:false,message:e.message}); }
});

router.get("/checks", requireBranch, async (req,res)=>{
  try { await ensureCheckSheet(); const rows=parseRows(await readRange(`${CHECK_SHEET}!A:K`)).filter(row => clean(row.BRANCH_ID) === req.authBranchId); res.json({success:true,data:rows}); }
  catch(e){ res.status(500).json({success:false,message:e.message}); }
});

router.post("/check", requireBranch, async (req,res)=>{
  try {
    const code=clean(req.body?.code); const user=clean(req.authUser?.fullName || req.authUser?.username); const remark=clean(req.body?.remark);
    if(!code) return res.status(400).json({success:false,message:"กรุณาระบุ CODE"});
    const d=await getData(req.authBranchId); const x=buildSystemDashboard(d); const item=x.balances.find(v=>v.code===code);
    if(!item) return res.status(404).json({success:false,message:`ไม่พบ CODE: ${code}`});
    const status=item.balance>=item.required?"PASS":"FAIL";
    const result = await withSequenceLock("EMERGENCY_CHECK_LOG:CHECK_ID", async () => {
      await ensureCheckSheet();
      const sheets=await getSheets();
      const now=new Date();
      const { yyyy: year, mm } = getBangkokDateParts(now);
      const history=parseRows(await readRange(`${CHECK_SHEET}!A:K`));
      const values = history.map(row => clean(row.CHECK_ID));
      const next = maxAnnualSequence(values, "EC", year) + 1;
      const id = formatAnnualNumber("EC", next, now);
      await sheets.spreadsheets.values.append({spreadsheetId:getSpreadsheetId(),range:`${CHECK_SHEET}!A:K`,valueInputOption:"USER_ENTERED",requestBody:{values:[[id,now.toLocaleDateString("en-CA",{timeZone:"Asia/Bangkok"}),now.toLocaleTimeString("en-GB",{timeZone:"Asia/Bangkok"}),item.code,item.name,item.required,item.balance,status,user,remark,req.authBranchId]]}});
      return { id, now };
    });
    res.json({success:true,data:{...item,checkId:result.id,checkStatus:status,checkedAt:result.now.toISOString()}});
  } catch(e){ console.error("EMERGENCY CHECK ERROR:",e); res.status(500).json({success:false,message:e.message}); }
});
module.exports=router;
