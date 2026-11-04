const express = require("express");
const router = express.Router();
const { getSheets, getSpreadsheetId } = require("../../config/google");
const { requireAuth } = require("../auth/auth.middleware");
const auth = require("../auth/auth.service");
const branchService = require("../branches/branches.service");
router.use(requireAuth);

const SHEET = "TEMPERATURE_CHECK_LOG";
const RECORDER_SHEET = "TEMPERATURE_CHECK_RECORDER";
const ALERT_SHEET = "TEMPERATURE_CHECK_ALERTS";
const HEADERS = ["RECORD_ID","DATE","TIME","TYPE","VALUE","BRANCH_ID","USER","SOURCE","REMARK","STATUS"];
const RECORDER_HEADERS = [
  "RECORDER_ID",
  "DATE",
  "TIME",
  "BRANCH_ID",
  "USER_ID",
  "RECORDER_NAME",
  "CHECKER_NAME",
  "STATUS"
];

const ALERT_HEADERS = [
  "ALERT_ID",
  "DATE",
  "TIME",
  "BRANCH_ID",
  "TYPE",
  "VALUE",
  "MIN_STANDARD",
  "MAX_STANDARD",
  "ALERT_REASON",
  "ALERT_STATUS"
];

const TYPES = new Set(["freezer","fridge","room","humidity"]);
const TIMES = new Set(["09:00","16:00"]);
const clean = v => String(v ?? "").trim();
const quote = s => `'${String(s).replace(/'/g,"''")}'`;
function parseRows(values) { if (!values?.length) return []; const h=values[0].map(v=>clean(v).toUpperCase()); return values.slice(1).filter(r=>r.some(v=>clean(v)!=="")).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]??""]))); }
function rangeStatus(type,value) { const v=Number(value); if(type==="freezer") return v>=-25&&v<=-15?"IN_RANGE":"OUT_OF_RANGE"; if(type==="fridge") return v>=2&&v<=8?"IN_RANGE":"OUT_OF_RANGE"; if(type==="room") return v<=30?"IN_RANGE":"OUT_OF_RANGE"; if(type==="humidity") return v<=70?"IN_RANGE":"OUT_OF_RANGE"; return "UNKNOWN"; }
function standards(type) { return ({freezer:{min:-25,max:-15,label:"อุณหภูมิช่องแช่แข็ง"},fridge:{min:2,max:8,label:"อุณหภูมิช่องธรรมดา"},room:{min:"",max:30,label:"อุณหภูมิห้อง"},humidity:{min:"",max:70,label:"ความชื้นสัมพัทธ์"}})[type]; }
function validDate(d) { if(!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false; const x=new Date(`${d}T00:00:00Z`); return !Number.isNaN(x.getTime())&&x.toISOString().slice(0,10)===d; }
function normalizeSheetDate(value) {
 const raw = clean(value);
 if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
 // Google Sheets may return formatted dates such as 10/1/2026 (M/D/YYYY).
 const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
 if (m) return `${m[3]}-${String(Number(m[1])).padStart(2,"0")}-${String(Number(m[2])).padStart(2,"0")}`;
 return raw;
}
async function ensureSheet(title, headers) {
 const sheets=await getSheets(), spreadsheetId=getSpreadsheetId();
 const book=await sheets.spreadsheets.get({spreadsheetId,fields:"sheets(properties(title))"});
 const exists=(book.data.sheets||[]).some(s=>s.properties?.title===title);
 if(!exists) await sheets.spreadsheets.batchUpdate({spreadsheetId,requestBody:{requests:[{addSheet:{properties:{title}}}]}});
 const r=await sheets.spreadsheets.values.get({spreadsheetId,range:`${quote(title)}!A1:Z1`}).catch(()=>({data:{values:[]}}));
 const current=r.data.values?.[0]||[];
 if(!current.some(v=>clean(v))) await sheets.spreadsheets.values.update({spreadsheetId,range:`${quote(title)}!A1:${String.fromCharCode(64+headers.length)}1`,valueInputOption:"RAW",requestBody:{values:[headers]}});
 else if(headers.some((h,i)=>clean(current[i]).toUpperCase()!==h)) throw new Error(`${title} มีหัวคอลัมน์ไม่ตรงตามระบบ กรุณาตรวจสอบชีต`);
}
async function ensureSheets() { await ensureSheet(SHEET,HEADERS); await ensureSheet(RECORDER_SHEET,RECORDER_HEADERS); await ensureSheet(ALERT_SHEET,ALERT_HEADERS); }
async function readRecords() { await ensureSheets(); const r=await getSheets().then(s=>s.spreadsheets.values.get({spreadsheetId:getSpreadsheetId(),range:`${quote(SHEET)}!A:J`})); return parseRows(r.data.values||[]); }
async function authorizedBranch(req) {
 const session=auth.getSession(req); const bid=clean(session?.currentBranchId); if(!bid||bid==="ALL") throw Object.assign(new Error("กรุณาเลือกสาขาที่ปฏิบัติงานก่อนใช้งาน"),{status:400});
 const users=await auth.listUsers(); const user=users.find(u=>String(u.userId)===String(req.authUser?.userId));
 if(!user||user.status!=="ACTIVE") throw Object.assign(new Error("บัญชีผู้ใช้งานไม่พร้อมใช้งาน"),{status:403});
 const branches=await branchService.listBranches({includeInactive:false}); const branch=branches.find(b=>clean(b.BRANCH_ID)===bid);
 if(!branch) throw Object.assign(new Error("ไม่พบสาขาหรือสาขาปิดใช้งานแล้ว"),{status:403});
 const allowed=user.role==="ADMIN"||(user.branchIds||[]).some(id=>clean(id).toUpperCase()===bid.toUpperCase());
 if(!allowed) throw Object.assign(new Error("คุณไม่มีสิทธิ์เข้าถึงสาขานี้"),{status:403});
 return {bid,branch,user};
}
function errorResponse(res,e) { return res.status(e.status||500).json({success:false,ok:false,message:e.message||"ดำเนินการไม่สำเร็จ"}); }
router.get("/records",async(req,res)=>{ try { const {bid}=await authorizedBranch(req); const month=clean(req.query.month); if(month&&!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({success:false,message:"รูปแบบเดือนต้องเป็น YYYY-MM"}); const data=(await readRecords()).filter(r=>clean(r.BRANCH_ID)===bid&&(!month||normalizeSheetDate(r.DATE).slice(0,7)===month)); res.json({success:true,data}); } catch(e){console.error("TEMPERATURE CHECK READ ERROR:",e);errorResponse(res,e);} });
router.post("/records",async(req,res)=>{ try {
 const {bid,branch,user}=await authorizedBranch(req); const body=req.body||{}; const date=clean(body.date),time=clean(body.time),type=clean(body.type).toLowerCase(),value=Number(body.value);
 if(!validDate(date)) return res.status(400).json({success:false,message:"กรุณาระบุวันที่ให้ถูกต้อง"}); if(!TIMES.has(time)) return res.status(400).json({success:false,message:"รอบเวลาต้องเป็น 09:00 หรือ 16:00"}); if(!TYPES.has(type)) return res.status(400).json({success:false,message:"ประเภทการตรวจไม่ถูกต้อง"}); if(body.value===""||body.value===null||body.value===undefined||!Number.isFinite(value)) return res.status(400).json({success:false,message:"ค่าที่วัดได้ต้องเป็นตัวเลข"});
 await ensureSheets(); const sheets=await getSheets(), spreadsheetId=getSpreadsheetId(), now=new Date().toISOString(); const recordId=`TC-${date.replace(/-/g,"")}-${time.replace(":","")}-${Math.random().toString(36).slice(2,8).toUpperCase()}`; const recorder=clean(user.fullName||user.username||req.authUser?.fullName||req.authUser?.username); const source=clean(body.source)==="E-StockScan"?"E-StockScan":(clean(body.source)||"FORM"); const remark=clean(body.remark),status=rangeStatus(type,value),std=standards(type);
 await sheets.spreadsheets.values.append({spreadsheetId,range:`${quote(SHEET)}!A:J`,valueInputOption:"USER_ENTERED",insertDataOption:"INSERT_ROWS",requestBody:{values:[[recordId,date,time,type,value,bid,recorder,source,remark,status]]}});
const recorderId = `TCR-${recordId}`;

await sheets.spreadsheets.values.append({
  spreadsheetId,
  range: `${quote(RECORDER_SHEET)}!A:H`,
  valueInputOption: "USER_ENTERED",
  insertDataOption: "INSERT_ROWS",
  requestBody: {
    values: [[
      recorderId,
      date,
      time,
      bid,
      user.userId,
      recorder,
      "",
      "RECORDED"
    ]]
  }
});

// บันทึกการแจ้งเตือนเมื่อค่าที่วัดอยู่นอกเกณฑ์
if (status === "OUT_OF_RANGE") {
  const alertId = `TCA-${recordId}`;

  const reason =
    std.min !== "" && value < std.min
      ? "ค่าต่ำกว่าเกณฑ์"
      : std.max !== "" && value > std.max
        ? "ค่าสูงกว่าเกณฑ์"
        : "ค่าอยู่นอกเกณฑ์ที่กำหนด";

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${quote(ALERT_SHEET)}!A:J`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [[
        alertId,
        date,
        time,
        bid,
        type,
        value,
        std.min,
        std.max,
        `${std.label}: ${reason}`,
        "NEW"
      ]]
    }
  });
}


res.status(201).json({
  success: true,
  data: {
    RECORD_ID: recordId,
    DATE: date,
    TIME: time,
    TYPE: type,
    VALUE: value,
    BRANCH_ID: bid,
    BRANCH_NAME: branch.BRANCH_NAME,
    USER: recorder,
    USER_ID: user.userId,
    SOURCE: source,
    REMARK: remark,
    STATUS: status
  }
});

} catch (e) {
  console.error("TEMPERATURE CHECK SAVE ERROR:", e);
  errorResponse(res, e);
}
});

module.exports = router;