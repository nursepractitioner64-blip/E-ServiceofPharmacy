const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const { getSheets, getSpreadsheetId } = require("../../config/google");
const { requireAuth, requireAdmin, requireBranch } = require("../auth/auth.middleware");

router.use(requireAuth);

const SHEETS = {
  master: "EQUIPMENT_MASTER",
  checklist: "EQUIPMENT_CHECKLIST_MASTER",
  assets: "BRANCH_EQUIPMENT",
  inspections: "EQUIPMENT_INSPECTION",
  details: "EQUIPMENT_INSPECTION_DETAIL"
};

const HEADERS = {
  [SHEETS.master]: ["MASTER_CODE","EQUIPMENT_NAME","CATEGORY","DESCRIPTION","INSPECTION_CYCLE","CYCLE_INTERVAL","CYCLE_UNIT","STATUS","CREATED_AT","CREATED_BY","UPDATED_AT","UPDATED_BY"],
  [SHEETS.checklist]: ["CHECKLIST_ITEM_ID","MASTER_CODE","VERSION","SORT_ORDER","ITEM_LABEL","INPUT_TYPE","REQUIRED","OPTIONS_JSON","PASS_CONDITION_JSON","AFFECTS_RESULT","STATUS","CREATED_AT","CREATED_BY"],
  [SHEETS.assets]: ["EQUIPMENT_ID","BRANCH_ID","MASTER_CODE","ASSET_CODE","BRAND","MODEL","SERIAL_NUMBER","LOCATION","INSTALL_DATE","PHOTO_URL","QR_TOKEN","STATUS","CREATED_AT","CREATED_BY","UPDATED_AT","UPDATED_BY"],
  [SHEETS.inspections]: ["INSPECTION_ID","EQUIPMENT_ID","BRANCH_ID","MASTER_CODE","INSPECTION_DATE","INSPECTION_TIME","CHECKLIST_VERSION","OVERALL_STATUS","INSPECTOR_USER_ID","INSPECTOR_NAME","REMARK","CREATED_AT"],
  [SHEETS.details]: ["DETAIL_ID","INSPECTION_ID","EQUIPMENT_ID","BRANCH_ID","MASTER_CODE","CHECKLIST_ITEM_ID","CHECKLIST_VERSION","ITEM_LABEL","INPUT_TYPE","ANSWER_VALUE","RESULT_STATUS","REMARK","PHOTO_URL","CREATED_AT"]
};

let ensurePromise = null;
const clean = value => String(value ?? "").trim();
const upper = value => clean(value).toUpperCase();
const nowIso = () => new Date().toISOString();
const uuid = prefix => `${prefix}-${crypto.randomUUID()}`;

function bangkokDateTime(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
  }).formatToParts(date);
  const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}:${p.second}` };
}

function parseRows(values) {
  if (!values?.length) return [];
  const headers = values[0].map(x => upper(x));
  return values.slice(1).map((row, index) => {
    const out = { __rowNumber: index + 2 };
    headers.forEach((header, i) => { if (header) out[header] = row[i] ?? ""; });
    return out;
  });
}

function jsonParse(value, fallback) {
  try { return value ? JSON.parse(value) : fallback; } catch (_) { return fallback; }
}

async function ensureSheets() {
  if (ensurePromise) return ensurePromise;
  ensurePromise = (async () => {
    const sheets = await getSheets();
    const spreadsheetId = getSpreadsheetId();
    const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets(properties(title))" });
    const existing = new Set((meta.data.sheets || []).map(s => s.properties?.title));
    const missing = Object.values(SHEETS).filter(name => !existing.has(name));
    if (missing.length) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: missing.map(title => ({ addSheet: { properties: { title } } })) }
      });
    }
    for (const [sheetName, headers] of Object.entries(HEADERS)) {
      const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${sheetName}!A1:Z1` });
      const current = (result.data.values || [])[0] || [];
      if (!current.length) {
        await sheets.spreadsheets.values.update({
          spreadsheetId, range: `${sheetName}!A1:${columnLetter(headers.length)}1`,
          valueInputOption: "RAW", requestBody: { values: [headers] }
        });
      } else if (headers.some((h, i) => upper(current[i]) !== h)) {
        throw new Error(`Header ของชีต ${sheetName} ไม่ตรงกับระบบ Equipment กรุณาตรวจสอบก่อนใช้งาน`);
      }
    }
    return sheets;
  })().catch(err => { ensurePromise = null; throw err; });
  return ensurePromise;
}

function columnLetter(n) {
  let out = "";
  while (n > 0) { const r = (n - 1) % 26; out = String.fromCharCode(65 + r) + out; n = Math.floor((n - 1) / 26); }
  return out;
}

async function readSheet(sheetName) {
  const sheets = await ensureSheets();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(), range: `${sheetName}!A:Z`
  });
  return parseRows(result.data.values || []);
}

async function appendRows(sheetName, rows) {
  if (!rows.length) return;
  const sheets = await ensureSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(), range: `${sheetName}!A:Z`,
    valueInputOption: "RAW", insertDataOption: "INSERT_ROWS",
    requestBody: { values: rows }
  });
}

async function updateRow(sheetName, rowNumber, values) {
  const sheets = await ensureSheets();
  const headers = HEADERS[sheetName];
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: `${sheetName}!A${rowNumber}:${columnLetter(headers.length)}${rowNumber}`,
    valueInputOption: "RAW", requestBody: { values: [values] }
  });
}

function userName(req) {
  return clean(req.authUser?.fullName || req.authUser?.username || req.authUser?.userId || "ผู้ใช้งาน");
}
function userId(req) { return clean(req.authUser?.userId || req.authUser?.username); }
function parseAsset(row) {
  return {
    equipmentId: clean(row.EQUIPMENT_ID), branchId: clean(row.BRANCH_ID), masterCode: upper(row.MASTER_CODE),
    assetCode: clean(row.ASSET_CODE), brand: clean(row.BRAND), model: clean(row.MODEL),
    serialNumber: clean(row.SERIAL_NUMBER), location: clean(row.LOCATION), installDate: clean(row.INSTALL_DATE),
    photoUrl: clean(row.PHOTO_URL), qrToken: clean(row.QR_TOKEN), status: upper(row.STATUS)
  };
}
function parseMaster(row) {
  return {
    masterCode: upper(row.MASTER_CODE), equipmentName: clean(row.EQUIPMENT_NAME), category: clean(row.CATEGORY),
    description: clean(row.DESCRIPTION), inspectionCycle: upper(row.INSPECTION_CYCLE),
    cycleInterval: Number(row.CYCLE_INTERVAL || 1), cycleUnit: upper(row.CYCLE_UNIT || "DAY"),
    status: upper(row.STATUS)
  };
}

async function getActiveChecklist(masterCode) {
  const rows = (await readSheet(SHEETS.checklist))
    .filter(r => upper(r.MASTER_CODE) === upper(masterCode) && upper(r.STATUS) === "ACTIVE");
  if (!rows.length) return { version: 1, items: [] };
  const version = Math.max(...rows.map(r => Number(r.VERSION || 1)));
  const items = rows.filter(r => Number(r.VERSION || 1) === version)
    .sort((a,b) => Number(a.SORT_ORDER || 0) - Number(b.SORT_ORDER || 0))
    .map(r => ({
      checklistItemId: clean(r.CHECKLIST_ITEM_ID), masterCode: upper(r.MASTER_CODE), version,
      sortOrder: Number(r.SORT_ORDER || 0), itemLabel: clean(r.ITEM_LABEL), inputType: upper(r.INPUT_TYPE),
      required: upper(r.REQUIRED) !== "FALSE", options: jsonParse(r.OPTIONS_JSON, []),
      passCondition: jsonParse(r.PASS_CONDITION_JSON, {}), affectsResult: upper(r.AFFECTS_RESULT) !== "FALSE"
    }));
  return { version, items };
}

function evaluateAnswer(item, raw) {
  const value = clean(raw?.value);
  const remark = clean(raw?.remark);
  const photoUrl = clean(raw?.photoUrl);
  const type = upper(item.INPUT_TYPE);
  const condition = jsonParse(item.PASS_CONDITION_JSON, {});
  if (item.REQUIRED !== "FALSE" && !value && type !== "PHOTO") {
    throw new Error(`กรุณากรอก: ${item.ITEM_LABEL}`);
  }
  if (item.REQUIRED === "FALSE" && !value && type !== "PHOTO") {
    return { value: "", result: "NA", remark, photoUrl };
  }
  if (type === "PASS_FAIL") {
    const answer = upper(value);
    if (!["PASS","FAIL"].includes(answer)) throw new Error(`คำตอบไม่ถูกต้อง: ${item.ITEM_LABEL}`);
    return { value: answer, result: answer, remark, photoUrl };
  }
  if (type === "YES_NO") {
    const answer = upper(value);
    if (!["YES","NO"].includes(answer)) throw new Error(`คำตอบไม่ถูกต้อง: ${item.ITEM_LABEL}`);
    const passValues = (condition.passValues || ["YES"]).map(upper);
    return { value: answer, result: passValues.includes(answer) ? "PASS" : "FAIL", remark, photoUrl };
  }
  if (type === "NUMBER") {
    const number = Number(value);
    if (!value || !Number.isFinite(number)) throw new Error(`กรุณาระบุตัวเลข: ${item.ITEM_LABEL}`);
    const hasMin = condition.min !== undefined && condition.min !== "";
    const hasMax = condition.max !== undefined && condition.max !== "";
    if (!hasMin && !hasMax) throw new Error(`Master ยังไม่ได้กำหนดเกณฑ์ตัวเลขของ ${item.ITEM_LABEL}`);
    const pass = (!hasMin || number >= Number(condition.min)) && (!hasMax || number <= Number(condition.max));
    return { value: String(number), result: pass ? "PASS" : "FAIL", remark, photoUrl };
  }
  if (type === "SELECT") {
    const options = jsonParse(item.OPTIONS_JSON, []);
    if (options.length && !options.includes(value)) throw new Error(`ตัวเลือกไม่ถูกต้อง: ${item.ITEM_LABEL}`);
    const passValues = (condition.passValues || []).map(upper);
    const result = item.AFFECTS_RESULT === "FALSE" ? "NA" : (passValues.includes(upper(value)) ? "PASS" : "FAIL");
    return { value, result, remark, photoUrl };
  }
  if (type === "PHOTO") {
    return { value: photoUrl || value, result: "NA", remark, photoUrl: photoUrl || value };
  }
  if (type === "TEXT") {
    return { value, result: "NA", remark, photoUrl };
  }
  throw new Error(`ไม่รองรับรูปแบบ Checklist: ${type}`);
}

function dateOnly(value) {
  const s = clean(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
}
function addDays(dateText, amount) {
  const [y,m,d] = dateText.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + amount));
  return date.toISOString().slice(0,10);
}
function latestByAssetDate(inspections) {
  const map = new Map();
  for (const row of inspections) {
    const date = dateOnly(row.INSPECTION_DATE);
    const key = `${clean(row.EQUIPMENT_ID)}|${date}`;
    const previous = map.get(key);
    const stamp = `${date}T${clean(row.INSPECTION_TIME)}`;
    const oldStamp = previous ? `${dateOnly(previous.INSPECTION_DATE)}T${clean(previous.INSPECTION_TIME)}` : "";
    if (!previous || stamp >= oldStamp) map.set(key, row);
  }
  return map;
}
function hasSevenDayFail(equipmentId, dateText, dailyMap) {
  for (let offset = 0; offset < 7; offset++) {
    const date = addDays(dateText, -offset);
    const row = dailyMap.get(`${equipmentId}|${date}`);
    if (!row || upper(row.OVERALL_STATUS) !== "FAIL") return false;
  }
  return true;
}

// ------------------------------
// MASTER (ADMIN ONLY for writes)
// ------------------------------
router.get("/master", async (req, res) => {
  try {
    const rows = await readSheet(SHEETS.master);
    res.json({ ok: true, data: rows.map(parseMaster).filter(x => x.masterCode) });
  } catch (err) { console.error("EQUIPMENT MASTER READ:", err); res.status(500).json({ ok:false, message:err.message }); }
});

router.post("/master", requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const code = upper(body.masterCode);
    const name = clean(body.equipmentName);
    const cycle = upper(body.inspectionCycle || "DAILY");
    if (!/^[A-Z0-9_-]{2,30}$/.test(code)) return res.status(400).json({ ok:false, message:"CODE ต้องเป็น A-Z, 0-9, _ หรือ - ความยาว 2–30 ตัว" });
    if (!name) return res.status(400).json({ ok:false, message:"กรุณาระบุชื่ออุปกรณ์" });
    if (!["DAILY","WEEKLY","MONTHLY","CUSTOM"].includes(cycle)) return res.status(400).json({ ok:false, message:"รอบตรวจไม่ถูกต้อง" });
    const rows = await readSheet(SHEETS.master);
    if (rows.some(r => upper(r.MASTER_CODE) === code)) return res.status(409).json({ ok:false, message:"มี Master CODE นี้แล้ว" });
    const now = nowIso();
    await appendRows(SHEETS.master, [[code,name,clean(body.category),clean(body.description),cycle,Number(body.cycleInterval || 1),upper(body.cycleUnit || "DAY"),"ACTIVE",now,userName(req),now,userName(req)]]);
    res.status(201).json({ ok:true, data:{ masterCode:code, equipmentName:name } });
  } catch (err) { console.error("EQUIPMENT MASTER CREATE:", err); res.status(500).json({ ok:false, message:err.message }); }
});

router.put("/master/:code", requireAdmin, async (req, res) => {
  try {
    const code = upper(req.params.code);
    const rows = await readSheet(SHEETS.master);
    const row = rows.find(r => upper(r.MASTER_CODE) === code);
    if (!row) return res.status(404).json({ ok:false, message:"ไม่พบ Master CODE" });
    const b = req.body || {};
    const name = clean(b.equipmentName || row.EQUIPMENT_NAME);
    const cycle = upper(b.inspectionCycle || row.INSPECTION_CYCLE);
    if (!name || !["DAILY","WEEKLY","MONTHLY","CUSTOM"].includes(cycle)) return res.status(400).json({ ok:false, message:"ข้อมูล Master ไม่ถูกต้อง" });
    const now = nowIso();
    const vals = [code,name,clean(b.category ?? row.CATEGORY),clean(b.description ?? row.DESCRIPTION),cycle,Number(b.cycleInterval ?? row.CYCLE_INTERVAL ?? 1),upper(b.cycleUnit ?? row.CYCLE_UNIT ?? "DAY"),upper(b.status || row.STATUS || "ACTIVE"),row.CREATED_AT,row.CREATED_BY,now,userName(req)];
    await updateRow(SHEETS.master,row.__rowNumber,vals);
    res.json({ ok:true, message:"บันทึก Master สำเร็จ" });
  } catch (err) { console.error("EQUIPMENT MASTER UPDATE:", err); res.status(500).json({ ok:false, message:err.message }); }
});

router.get("/master/:code/checklist", async (req, res) => {
  try {
    const data = await getActiveChecklist(req.params.code);
    res.json({ ok:true, data });
  } catch (err) { res.status(500).json({ ok:false, message:err.message }); }
});

router.put("/master/:code/checklist", requireAdmin, async (req, res) => {
  try {
    const code = upper(req.params.code);
    const master = (await readSheet(SHEETS.master)).find(r => upper(r.MASTER_CODE) === code && upper(r.STATUS) === "ACTIVE");
    if (!master) return res.status(404).json({ ok:false, message:"ไม่พบ Master ที่เปิดใช้งาน" });
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ ok:false, message:"กรุณาเพิ่มรายการ Checklist อย่างน้อย 1 รายการ" });
    const existing = (await readSheet(SHEETS.checklist)).filter(r => upper(r.MASTER_CODE) === code);
    const version = existing.length ? Math.max(...existing.map(r => Number(r.VERSION || 1))) + 1 : 1;
    const now = nowIso();
    const normalizedItems = items.map((item,index) => {
      const label = clean(item.itemLabel);
      const type = upper(item.inputType || "PASS_FAIL");
      if (!label) throw new Error(`รายการที่ ${index+1} ไม่มีชื่อ`);
      if (!["PASS_FAIL","YES_NO","NUMBER","SELECT","TEXT","PHOTO"].includes(type)) throw new Error(`ชนิดคำตอบไม่รองรับ: ${type}`);
      const affects = item.affectsResult !== false && !["TEXT","PHOTO"].includes(type);
      const condition = item.passCondition || {};
      if (type === "NUMBER" && affects && condition.min === undefined && condition.max === undefined) throw new Error(`กรุณากำหนดเกณฑ์ตัวเลขของ ${label}`);
      if (type === "SELECT" && affects && !(condition.passValues || []).length) throw new Error(`กรุณากำหนดตัวเลือกที่ถือว่าผ่านของ ${label}`);
      return { item,label,type,affects,condition };
    });
    if (!normalizedItems.some(x => x.affects)) return res.status(400).json({ok:false,message:"ต้องมีรายการอย่างน้อย 1 ข้อที่ใช้ตัดสินผลผ่าน/ไม่ผ่าน"});
    const rows = normalizedItems.map((x,index) => [uuid("ECI"),code,version,index+1,x.label,x.type,x.item.required === false ? "FALSE" : "TRUE",JSON.stringify(x.item.options || []),JSON.stringify(x.condition),x.affects ? "TRUE" : "FALSE","ACTIVE",now,userName(req)]);
    await appendRows(SHEETS.checklist, rows);
    res.json({ ok:true, data:{ masterCode:code, version, itemCount:rows.length } });
  } catch (err) { res.status(400).json({ ok:false, message:err.message }); }
});

// ------------------------------
// BRANCH ASSETS (ADMIN + STAFF)
// ------------------------------
router.get("/branch-assets", requireBranch, async (req, res) => {
  try {
    const [assets, masters] = await Promise.all([readSheet(SHEETS.assets),readSheet(SHEETS.master)]);
    const masterMap = new Map(masters.map(m => [upper(m.MASTER_CODE),parseMaster(m)]));
    const data = assets.filter(r => clean(r.BRANCH_ID) === req.authBranchId && upper(r.STATUS) !== "INACTIVE")
      .map(r => ({...parseAsset(r), master:masterMap.get(upper(r.MASTER_CODE)) || null, qrValue:`EQ1:${clean(r.QR_TOKEN)}`}));
    res.json({ ok:true, data, branchId:req.authBranchId });
  } catch (err) { console.error("EQUIPMENT ASSET READ:",err); res.status(500).json({ok:false,message:err.message}); }
});

router.post("/branch-assets", requireBranch, async (req, res) => {
  try {
    const b = req.body || {};
    const code = upper(b.masterCode);
    const master = (await readSheet(SHEETS.master)).find(r => upper(r.MASTER_CODE) === code && upper(r.STATUS) === "ACTIVE");
    if (!master) return res.status(400).json({ok:false,message:"ไม่พบ Master CODE หรือถูกปิดใช้งาน"});
    const assetCode = clean(b.assetCode);
    if (!assetCode) return res.status(400).json({ok:false,message:"กรุณาระบุรหัสประจำเครื่องของสาขา"});
    const assets = await readSheet(SHEETS.assets);
    if (assets.some(r => clean(r.BRANCH_ID) === req.authBranchId && clean(r.ASSET_CODE).toUpperCase() === assetCode.toUpperCase())) {
      return res.status(409).json({ok:false,message:"รหัสประจำเครื่องนี้มีอยู่ในสาขาแล้ว"});
    }
    const id = uuid("EQ");
    const token = crypto.randomBytes(24).toString("hex");
    const now = nowIso();
    await appendRows(SHEETS.assets, [[id,req.authBranchId,code,assetCode,clean(b.brand),clean(b.model),clean(b.serialNumber),clean(b.location),dateOnly(b.installDate),clean(b.photoUrl),token,"ACTIVE",now,userName(req),now,userName(req)]]);
    res.status(201).json({ok:true,data:{equipmentId:id,assetCode,qrValue:`EQ1:${token}`}});
  } catch (err) { console.error("EQUIPMENT ASSET CREATE:",err); res.status(500).json({ok:false,message:err.message}); }
});

router.put("/branch-assets/:id", requireBranch, async (req, res) => {
  try {
    const rows = await readSheet(SHEETS.assets);
    const row = rows.find(r => clean(r.EQUIPMENT_ID) === clean(req.params.id) && clean(r.BRANCH_ID) === req.authBranchId);
    if (!row) return res.status(404).json({ok:false,message:"ไม่พบอุปกรณ์ในสาขาที่เลือก"});
    const b = req.body || {};
    const assetCode = clean(b.assetCode ?? row.ASSET_CODE);
    const masterCode = upper(b.masterCode || row.MASTER_CODE);
    const master = (await readSheet(SHEETS.master)).find(r => upper(r.MASTER_CODE) === masterCode && upper(r.STATUS) === "ACTIVE");
    if (!master) return res.status(400).json({ok:false,message:"ไม่พบ Master CODE หรือถูกปิดใช้งาน"});
    if (rows.some(r => clean(r.BRANCH_ID) === req.authBranchId && clean(r.ASSET_CODE).toUpperCase() === assetCode.toUpperCase() && clean(r.EQUIPMENT_ID) !== clean(row.EQUIPMENT_ID))) {
      return res.status(409).json({ok:false,message:"รหัสประจำเครื่องซ้ำในสาขา"});
    }
    const vals = [row.EQUIPMENT_ID,row.BRANCH_ID,masterCode,assetCode,clean(b.brand ?? row.BRAND),clean(b.model ?? row.MODEL),clean(b.serialNumber ?? row.SERIAL_NUMBER),clean(b.location ?? row.LOCATION),dateOnly(b.installDate ?? row.INSTALL_DATE),clean(b.photoUrl ?? row.PHOTO_URL),row.QR_TOKEN,upper(b.status || row.STATUS),row.CREATED_AT,row.CREATED_BY,nowIso(),userName(req)];
    await updateRow(SHEETS.assets,row.__rowNumber,vals);
    res.json({ok:true,message:"บันทึกข้อมูลอุปกรณ์แล้ว"});
  } catch (err) { res.status(500).json({ok:false,message:err.message}); }
});

router.post("/scan/resolve", requireBranch, async (req, res) => {
  try {
    const raw = clean(req.body?.qrValue || req.body?.qrToken || req.body?.value);
    const token = raw.startsWith("EQ1:") ? raw.slice(4) : raw;
    if (!/^[a-f0-9]{48}$/i.test(token)) return res.status(400).json({ok:false,message:"QR Code ไม่ถูกต้อง"});
    const rows = await readSheet(SHEETS.assets);
    const row = rows.find(r => clean(r.QR_TOKEN) === token && clean(r.BRANCH_ID) === req.authBranchId && upper(r.STATUS) === "ACTIVE");
    if (!row) return res.status(404).json({ok:false,message:"ไม่พบอุปกรณ์นี้ในสาขาที่เลือก หรืออุปกรณ์ถูกปิดใช้งาน"});
    const master = (await readSheet(SHEETS.master)).find(r => upper(r.MASTER_CODE) === upper(row.MASTER_CODE) && upper(r.STATUS) === "ACTIVE");
    if (!master) return res.status(409).json({ok:false,message:"Master ของอุปกรณ์นี้ไม่ได้เปิดใช้งาน"});
    const checklist = await getActiveChecklist(row.MASTER_CODE);
    if (!checklist.items.length) return res.status(409).json({ok:false,message:"อุปกรณ์นี้ยังไม่มี Checklist ใน Master"});
    res.json({ok:true,data:{...parseAsset(row),master:parseMaster(master),checklist}});
  } catch (err) { console.error("EQUIPMENT QR RESOLVE:",err); res.status(500).json({ok:false,message:err.message}); }
});

router.post("/inspections", requireBranch, async (req, res) => {
  try {
    const b = req.body || {};
    const equipmentId = clean(b.equipmentId);
    if (!equipmentId) return res.status(400).json({ok:false,message:"ไม่พบรหัสเครื่อง"});
    const assetRow = (await readSheet(SHEETS.assets)).find(r => clean(r.EQUIPMENT_ID) === equipmentId && clean(r.BRANCH_ID) === req.authBranchId && upper(r.STATUS) === "ACTIVE");
    if (!assetRow) return res.status(404).json({ok:false,message:"ไม่พบอุปกรณ์ในสาขาที่เลือก"});
    const checklist = await getActiveChecklist(assetRow.MASTER_CODE);
    if (!checklist.items.length) return res.status(409).json({ok:false,message:"ไม่พบ Checklist ที่เปิดใช้งาน"});
    const submitted = Array.isArray(b.answers) ? b.answers : [];
    const answerMap = new Map(submitted.map(a => [clean(a.checklistItemId),a]));
    const evaluated = [];
    for (const item of checklist.items) {
      const raw = answerMap.get(item.checklistItemId) || {};
      if (item.required && !clean(raw.value) && upper(item.inputType) !== "PHOTO") {
        return res.status(400).json({ok:false,message:`กรุณาตอบ: ${item.itemLabel}`});
      }
      const result = evaluateAnswer({
        ITEM_LABEL:item.itemLabel, INPUT_TYPE:item.inputType, REQUIRED:item.required ? "TRUE" : "FALSE",
        OPTIONS_JSON:JSON.stringify(item.options || []), PASS_CONDITION_JSON:JSON.stringify(item.passCondition || {}),
        AFFECTS_RESULT:item.affectsResult ? "TRUE" : "FALSE"
      },raw);
      evaluated.push({item, ...result});
    }
    const resultItems = evaluated.filter(x => x.item.affectsResult && ["PASS","FAIL"].includes(x.result));
    if (!resultItems.length) return res.status(400).json({ok:false,message:"กรุณาตรวจอย่างน้อย 1 รายการที่ใช้ตัดสินผลผ่าน/ไม่ผ่าน"});
    const overall = resultItems.some(x => x.result === "FAIL") ? "FAIL" : "PASS";
    const dt = bangkokDateTime();
    const inspectionId = uuid("EQI");
    const inspector = userName(req);
    const header = [inspectionId,equipmentId,req.authBranchId,upper(assetRow.MASTER_CODE),dt.date,dt.time,checklist.version,overall,userId(req),inspector,clean(b.remark),nowIso()];
    const detailRows = evaluated.map(x => [uuid("EQD"),inspectionId,equipmentId,req.authBranchId,upper(assetRow.MASTER_CODE),x.item.checklistItemId,checklist.version,x.item.itemLabel,x.item.inputType,x.value,x.result,x.remark,x.photoUrl,nowIso()]);
    await appendRows(SHEETS.inspections,[header]);
    await appendRows(SHEETS.details,detailRows);
    res.status(201).json({ok:true,data:{inspectionId,equipmentId,assetCode:clean(assetRow.ASSET_CODE),masterCode:upper(assetRow.MASTER_CODE),inspectionDate:dt.date,inspectionTime:dt.time,status:overall,inspector}});
  } catch (err) { console.error("EQUIPMENT INSPECTION SAVE:",err); res.status(500).json({ok:false,message:err.message}); }
});

// ------------------------------
// REPORTS
// ------------------------------
router.get("/reports/monthly", requireBranch, async (req, res) => {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000 || year > 2100) {
      return res.status(400).json({ok:false,message:"เดือนหรือปีไม่ถูกต้อง"});
    }
    const [masterRows,assetRows,inspectionRows] = await Promise.all([
      readSheet(SHEETS.master),readSheet(SHEETS.assets),readSheet(SHEETS.inspections)
    ]);
    const masters = new Map(masterRows.filter(r => upper(r.STATUS) === "ACTIVE").map(r => [upper(r.MASTER_CODE),parseMaster(r)]));
    const assets = assetRows.filter(r => clean(r.BRANCH_ID) === req.authBranchId && upper(r.STATUS) === "ACTIVE");
    const inspections = inspectionRows.filter(r => clean(r.BRANCH_ID) === req.authBranchId);
    const dailyMap = latestByAssetDate(inspections);
    const daysInMonth = new Date(year,month,0).getDate();
    const byCode = new Map();
    for (const asset of assets) {
      const code = upper(asset.MASTER_CODE);
      if (!masters.has(code)) continue;
      if (!byCode.has(code)) byCode.set(code,[]);
      byCode.get(code).push(asset);
    }
    const data = [];
    for (const [code, codeAssets] of byCode.entries()) {
      const row = { code, name:masters.get(code).equipmentName, assetCount:codeAssets.length, days:{} };
      for (let day=1; day<=31; day++) {
        if (day > daysInMonth) { row.days[day] = {status:"NA",assetCount:codeAssets.length,inspectedCount:0,failCount:0,alert:false}; continue; }
        const dateText = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
        let inspectedCount=0, failCount=0, alert=false;
        for (const asset of codeAssets) {
          const found = dailyMap.get(`${clean(asset.EQUIPMENT_ID)}|${dateText}`);
          if (found) {
            inspectedCount++;
            if (upper(found.OVERALL_STATUS)==="FAIL") failCount++;
            if (hasSevenDayFail(clean(asset.EQUIPMENT_ID),dateText,dailyMap)) alert=true;
          }
        }
        let status = "NONE";
        if (failCount>0) status = "FAIL";
        else if (inspectedCount===codeAssets.length && inspectedCount>0) status = "PASS";
        else if (inspectedCount>0) status = "PARTIAL";
        row.days[day] = {status,assetCount:codeAssets.length,inspectedCount,failCount,alert};
      }
      data.push(row);
    }
    data.sort((a,b)=>a.code.localeCompare(b.code));
    const recorders = {};
    for (let day=1; day<=daysInMonth; day++) {
      const dateText = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
      const names = [...new Set(inspections.filter(r=>dateOnly(r.INSPECTION_DATE)===dateText).map(r=>clean(r.INSPECTOR_NAME)).filter(Boolean))];
      if (names.length) recorders[day]=names;
    }
    res.json({ok:true,month,year,branchId:req.authBranchId,daysInMonth,data,recorders});
  } catch (err) { console.error("EQUIPMENT MONTHLY REPORT:",err); res.status(500).json({ok:false,message:err.message}); }
});

router.get("/reports/day-details", requireBranch, async (req, res) => {
  try {
    const code = upper(req.query.masterCode);
    const date = dateOnly(req.query.date);
    if (!code || !date) return res.status(400).json({ok:false,message:"กรุณาระบุ Master CODE และวันที่"});
    const [assets,inspections] = await Promise.all([readSheet(SHEETS.assets),readSheet(SHEETS.inspections)]);
    const branchAssets = assets.filter(r=>clean(r.BRANCH_ID)===req.authBranchId && upper(r.MASTER_CODE)===code && upper(r.STATUS)==="ACTIVE");
    const dailyMap = latestByAssetDate(inspections.filter(r=>clean(r.BRANCH_ID)===req.authBranchId));
    const data = branchAssets.map(asset=>{
      const found = dailyMap.get(`${clean(asset.EQUIPMENT_ID)}|${date}`);
      return {
        equipmentId:clean(asset.EQUIPMENT_ID),assetCode:clean(asset.ASSET_CODE),brand:clean(asset.BRAND),
        model:clean(asset.MODEL),serialNumber:clean(asset.SERIAL_NUMBER),location:clean(asset.LOCATION),
        status:found?upper(found.OVERALL_STATUS):"NONE",inspectionId:found?clean(found.INSPECTION_ID):"",
        inspectionTime:found?clean(found.INSPECTION_TIME):"",inspectorName:found?clean(found.INSPECTOR_NAME):""
      };
    });
    const recorders = [...new Set(inspections.filter(r=>clean(r.BRANCH_ID)===req.authBranchId && dateOnly(r.INSPECTION_DATE)===date && upper(r.MASTER_CODE)===code).map(r=>clean(r.INSPECTOR_NAME)).filter(Boolean))];
    res.json({ok:true,masterCode:code,date,branchId:req.authBranchId,data,recorders});
  } catch (err) { res.status(500).json({ok:false,message:err.message}); }
});

router.get("/inspections/:id", requireBranch, async (req, res) => {
  try {
    const header = (await readSheet(SHEETS.inspections)).find(r=>clean(r.INSPECTION_ID)===clean(req.params.id) && clean(r.BRANCH_ID)===req.authBranchId);
    if (!header) return res.status(404).json({ok:false,message:"ไม่พบประวัติการตรวจในสาขาที่เลือก"});
    const details = (await readSheet(SHEETS.details)).filter(r=>clean(r.INSPECTION_ID)===clean(req.params.id) && clean(r.BRANCH_ID)===req.authBranchId);
    res.json({ok:true,data:{
      inspectionId:clean(header.INSPECTION_ID),equipmentId:clean(header.EQUIPMENT_ID),masterCode:clean(header.MASTER_CODE),
      date:clean(header.INSPECTION_DATE),time:clean(header.INSPECTION_TIME),status:upper(header.OVERALL_STATUS),
      inspectorName:clean(header.INSPECTOR_NAME),remark:clean(header.REMARK),
      items:details.map(d=>({label:clean(d.ITEM_LABEL),inputType:upper(d.INPUT_TYPE),answer:clean(d.ANSWER_VALUE),result:upper(d.RESULT_STATUS),remark:clean(d.REMARK),photoUrl:clean(d.PHOTO_URL)}))
    }});
  } catch (err) { res.status(500).json({ok:false,message:err.message}); }
});

module.exports = router;
