const express = require("express");
const router = express.Router();
const { getSheets, getSpreadsheetId } = require("../../config/google");

const SHEET_ID = getSpreadsheetId ? getSpreadsheetId() : process.env.GOOGLE_SHEET_ID;
const CHECK_SHEET = "EMERGENCY_CHECK_LOG";

const clean = v => String(v ?? "").trim();
const num = v => {
  const n = Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

function parseRows(values) {
  if (!values?.length) return [];
  const h = values[0].map(x => clean(x).toUpperCase());
  return values.slice(1).map(row =>
    Object.fromEntries(h.map((k,i) => [k, row[i] ?? ""]))
  );
}

async function values(range) {
  const sheets = await getSheets();
  const r = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range
  });
  return r.data.values || [];
}

async function ensureCheckSheet() {
  const sheets = await getSheets();
  try {
    await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${CHECK_SHEET}!A1`
    });
  } catch (_) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests: [{
        addSheet: { properties: { title: CHECK_SHEET } }
      }]}
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${CHECK_SHEET}!A1:J1`,
      valueInputOption: "RAW",
      requestBody: { values: [[
        "CHECK_ID","DATE","TIME","CODE","NAME",
        "REQUIRED","BALANCE","STATUS","USER","REMARK"
      ]]}
    });
  }
}

function dateParts(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return { y:d.getFullYear(), m:d.getMonth()+1, day:d.getDate() };
}

/*
 * Existing Daily Check contract:
 * GET /api/dailycheck?month=&year=
 * returns INVENTORY_MASTER rows with day columns.
 *
 * V7 enhancement:
 * - Prefer actual EMERGENCY_CHECK_LOG for each day.
 * - Keep COUNT_SESSION as fallback for legacy data.
 * - Add CHECK_STATUS / LAST_CHECK to each row.
 */
router.get("/", async (req,res) => {
  try {
    const now = new Date();
    const month = Number(req.query.month || now.getMonth()+1);
    const year = Number(req.query.year || now.getFullYear());

    const [masterValues, countValues, checkValues] = await Promise.all([
      values("INVENTORY_MASTER!A:Z"),
      values("COUNT_SESSION!A:G").catch(() => []),
      values(`${CHECK_SHEET}!A:J`).catch(() => [])
    ]);

    const master = parseRows(masterValues);
    const countRows = parseRows(countValues);
    const checks = parseRows(checkValues);

    const legacyMap = {};
    for (const r of countRows) {
      const code=clean(r.CODE);
      const p=dateParts(r.TIME);
      if (!code || !p || p.y!==year || p.m!==month) continue;
      const key=`${code}_${p.day}`;
      legacyMap[key]=(legacyMap[key]||0)+num(r.QTY);
    }

    // Latest real inspection for CODE + day.
    const checkMap = new Map();
    for (const r of checks) {
      const code=clean(r.CODE);
      if (!code) continue;
      const p=dateParts(r.DATE);
      if (!p || p.y!==year || p.m!==month) continue;
      const key=`${code}_${p.day}`;
      const previous=checkMap.get(key);
      const stamp=`${clean(r.DATE)} ${clean(r.TIME)}`;
      if (!previous || stamp > previous.stamp) {
        checkMap.set(key,{
          stamp,
          status:clean(r.STATUS).toUpperCase(),
          balance:num(r.BALANCE),
          required:num(r.REQUIRED),
          user:clean(r.USER),
          checkId:clean(r.CHECK_ID)
        });
      }
    }

    const output = master.slice(1).map(row => {
      const code=clean(row.CODE || row[0]);
      const name=clean(row.NAME || row[1]);
      const unit=clean(row.UNIT || row[2]);
      const required=num(row.REQUIRED ?? row[3]);
      const obj={CODE:code,NAME:name,UNIT:unit,REQUIRED:required};
      for(let day=1;day<=31;day++){
        const c=checkMap.get(`${code}_${day}`);
        obj[day] = c ? c.balance : (legacyMap[`${code}_${day}`] ?? "");
      }
      const all=[];
      for(let day=1;day<=31;day++){
        const c=checkMap.get(`${code}_${day}`);
        if(c) all.push({day,...c});
      }
      const latest=all.sort((a,b)=>b.stamp.localeCompare(a.stamp))[0];
      obj.CHECK_STATUS=latest?.status || "";
      obj.LAST_CHECK=latest?.stamp || "";
      obj.CHECK_USER=latest?.user || "";
      return obj;
    }).filter(x=>x.CODE);

    const checked=checks.filter(r=>{
      const p=dateParts(r.DATE);
      return p && p.y===year && p.m===month;
    });

    res.json({
      ok:true, success:true, month, year,
      data:output,
      summary:{
        total:output.length,
        checked: new Set(checked.map(r=>clean(r.CODE))).size,
        pass:checked.filter(r=>clean(r.STATUS).toUpperCase()==="PASS").length,
        fail:checked.filter(r=>clean(r.STATUS).toUpperCase()==="FAIL").length
      }
    });
  } catch(err) {
    console.error("DAILY CHECK ERROR:",err);
    res.status(500).json({ok:false,success:false,message:err.message});
  }
});

router.get("/status", async (req,res)=>{
  try {
    await ensureCheckSheet();
    const rows=parseRows(await values(`${CHECK_SHEET}!A:J`));
    res.json({success:true,data:rows});
  } catch(err) {
    res.status(500).json({success:false,message:err.message});
  }
});

router.post("/check", async (req,res)=>{
  try {
    const code=clean(req.body?.code);
    if(!code) return res.status(400).json({success:false,message:"กรุณาระบุ CODE"});
    const sheets=await getSheets();
    const master=parseRows(await values("INVENTORY_MASTER!A:Z"));
    const item=master.find(r=>clean(r.CODE)===code);
    if(!item) return res.status(404).json({success:false,message:"ไม่พบ CODE"});

    const required=num(item.REQUIRED);
    const balance=num(req.body?.balance);
    const status=balance>=required ? "PASS":"FAIL";
    await ensureCheckSheet();

    const now=new Date();
    const date=now.toLocaleDateString("en-CA",{timeZone:"Asia/Bangkok"});
    const time=now.toLocaleTimeString("en-GB",{timeZone:"Asia/Bangkok"});
    const id=`DC-${date.replaceAll("-","")}-${Date.now().toString().slice(-6)}`;

    await sheets.spreadsheets.values.append({
      spreadsheetId:SHEET_ID,
      range:`${CHECK_SHEET}!A:J`,
      valueInputOption:"USER_ENTERED",
      requestBody:{values:[[
        id,date,time,code,clean(item.NAME),
        required,balance,status,
        clean(req.body?.user || "system"),
        clean(req.body?.remark)
      ]]}
    });

    res.json({success:true,data:{
      checkId:id,date,time,code,
      name:clean(item.NAME),required,balance,status
    }});
  } catch(err) {
    console.error("DAILY CHECK SAVE ERROR:",err);
    res.status(500).json({success:false,message:err.message});
  }
});

module.exports=router;
