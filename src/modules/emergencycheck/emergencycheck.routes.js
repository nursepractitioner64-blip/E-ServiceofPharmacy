const express = require("express");
const router = express.Router();
const { getSheets, getSpreadsheetId } = require("../../config/google");
const { buildSystemDashboard } = require("../dashboard/summarydrug/dashboard.builder");

const CHECK_SHEET = "EMERGENCY_CHECK_LOG";
const CHECK_HEADERS = ["CHECK_ID","DATE","TIME","CODE","NAME","REQUIRED","BALANCE","STATUS","USER","REMARK"];

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
async function getData(){
  const [m, mv]=await Promise.all([readRange("INVENTORY_MASTER!A:Z"),readRange("INVENTORY_MOVEMENT!A:R")]);
  return {master:parseRows(m),movements:parseRows(mv)};
}
async function ensureCheckSheet(){
  const sheets=await getSheets();
  try { await sheets.spreadsheets.values.get({spreadsheetId:getSpreadsheetId(),range:`${CHECK_SHEET}!A1`}); return; }
  catch(e) {
    await sheets.spreadsheets.batchUpdate({spreadsheetId:getSpreadsheetId(),requestBody:{requests:[{addSheet:{properties:{title:CHECK_SHEET}}}]}});
    await sheets.spreadsheets.values.update({spreadsheetId:getSpreadsheetId(),range:`${CHECK_SHEET}!A1:J1`,valueInputOption:"RAW",requestBody:{values:[CHECK_HEADERS]}});
  }
}

router.get("/summary", async (req,res)=>{
  try { const d=await getData(); res.json({success:true,data:buildSystemDashboard(d)}); }
  catch(e){ console.error("EMERGENCY SUMMARY ERROR:",e); res.status(500).json({success:false,message:e.message}); }
});

router.get("/items", async (req,res)=>{
  try { const d=await getData(); const x=buildSystemDashboard(d); res.json({success:true,data:x.balances,summary:{totalItems:x.totalItems,readyItems:x.readyItems,missingItems:x.missingItems,expiringItems:x.expiringItems,expiredItems:x.expiredItems}}); }
  catch(e){ res.status(500).json({success:false,message:e.message}); }
});

router.get("/checks", async (req,res)=>{
  try { await ensureCheckSheet(); const rows=parseRows(await readRange(`${CHECK_SHEET}!A:J`)); res.json({success:true,data:rows}); }
  catch(e){ res.status(500).json({success:false,message:e.message}); }
});

router.post("/check", async (req,res)=>{
  try {
    const code=clean(req.body?.code); const user=clean(req.body?.user||req.body?.USER||"system"); const remark=clean(req.body?.remark);
    if(!code) return res.status(400).json({success:false,message:"กรุณาระบุ CODE"});
    const d=await getData(); const x=buildSystemDashboard(d); const item=x.balances.find(v=>v.code===code);
    if(!item) return res.status(404).json({success:false,message:`ไม่พบ CODE: ${code}`});
    const status=item.balance>=item.required?"PASS":"FAIL";
    await ensureCheckSheet();
    const sheets=await getSheets();
    const now=new Date();
    const id=`EC-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}-${Date.now().toString().slice(-6)}`;
    await sheets.spreadsheets.values.append({spreadsheetId:getSpreadsheetId(),range:`${CHECK_SHEET}!A:J`,valueInputOption:"USER_ENTERED",requestBody:{values:[[id,now.toLocaleDateString("en-CA",{timeZone:"Asia/Bangkok"}),now.toLocaleTimeString("en-GB",{timeZone:"Asia/Bangkok"}),item.code,item.name,item.required,item.balance,status,user,remark]]}});
    res.json({success:true,data:{...item,checkId:id,checkStatus:status,checkedAt:now.toISOString()}});
  } catch(e){ console.error("EMERGENCY CHECK ERROR:",e); res.status(500).json({success:false,message:e.message}); }
});
module.exports=router;
