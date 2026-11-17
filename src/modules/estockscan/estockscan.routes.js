
const router = require("express").Router();
const crypto = require("crypto");
const { requireAuth, requireBranch } = require("../auth/auth.middleware");
const { getSheets, getSpreadsheetId } = require("../../config/google");
const inventoryRepository = require("../dispense/dispense.repository");
const branchService = require("../branches/branches.service");

const COUNT_HEADERS = ["SESSION_ID", "MOVEMENT_ID", "CODE", "NAME", "QTY", "USER", "TIME", "BRANCH_ID"];
const RESULT_HEADERS = ["SESSION", "CODE", "REQUIRED", "ACTUAL", "DIFF", "BRANCH_ID"];
const DISPENSE_DETAIL_HEADERS = [
  "DISPENSE_ID", "REF_NO", "PATIENT_NAME", "HN", "MEDICINE_NAME",
  "DOSE_COUNT", "LOT", "EXP", "CODE", "USER", "TIME", "QR_RAW"
];
const sessionLocks = new Map();
let dispenseQueue = Promise.resolve();

const clean = value => String(value ?? "").trim();
const numeric = value => {
  const n = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
};
const normalizeName = value => clean(value).toLowerCase()
  .replace(/วัคซีน|vaccine|medicine|medication|ชื่อยา|ชื่อวัคซีน/g, "")
  .replace(/[\s\-_.(),/\\:;|]+/g, "")
  .replace(/[^\p{L}\p{N}]/gu, "");

async function values(range) {
  const sheets = await getSheets();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range,
    valueRenderOption: "FORMATTED_VALUE"
  });
  return result.data.values || [];
}

async function ensureHeaders(sheetName, expected) {
  const sheets = await getSheets();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: getSpreadsheetId(),
    fields: "sheets(properties(sheetId,title))"
  });
  const exists = (meta.data.sheets || []).some(s => s.properties?.title === sheetName);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: getSpreadsheetId(),
      requestBody: { requests: [{ addSheet: { properties: { title: sheetName } } }] }
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: getSpreadsheetId(),
      range: `${sheetName}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [expected] }
    });
    return;
  }

  const headerValues = await values(`${sheetName}!1:1`);
  const actual = (headerValues[0] || []).map(x => clean(x).toUpperCase());
  if (!actual.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: getSpreadsheetId(),
      range: `${sheetName}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [expected] }
    });
    return;
  }
  const matches = expected.every((h, i) => actual[i] === h);
  if (!matches) {
    const error = new Error(`${sheetName} มี Header ไม่ตรงกับโครงสร้างที่ระบบต้องใช้ จึงหยุดเพื่อป้องกันการเขียนผิดคอลัมน์`);
    error.status = 409;
    error.code = "SHEET_HEADER_MISMATCH";
    throw error;
  }
}

async function appendRows(sheetName, range, rows) {
  if (!rows.length) return { updatedRange: "", updatedRows: 0 };
  const sheets = await getSheets();
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(),
    range,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: rows }
  });
  return {
    updatedRange: response.data?.updates?.updatedRange || "",
    updatedRows: Number(response.data?.updates?.updatedRows || 0)
  };
}

async function getBranchMovements(branchId) {
  const rows = await inventoryRepository.getInventoryMovements();
  return rows.filter(r => clean(r.BRANCH_ID) === clean(branchId));
}

async function getInventoryMaster() {
  const rows = await values("INVENTORY_MASTER!A:Z");
  if (!rows.length) throw new Error("ไม่พบข้อมูล INVENTORY_MASTER");
  const headers = rows[0].map(x => clean(x).toUpperCase());
  const idx = Object.fromEntries(headers.map((h, i) => [h, i]));
  for (const required of ["CODE", "NAME", "REQUIRED"]) {
    if (idx[required] === undefined) throw new Error(`INVENTORY_MASTER ไม่มีคอลัมน์ ${required}`);
  }
  return rows.slice(1).filter(r => clean(r[idx.CODE])).map(r => ({
    code: clean(r[idx.CODE]),
    name: clean(r[idx.NAME]),
    unit: idx.UNIT === undefined ? "" : clean(r[idx.UNIT]),
    required: numeric(r[idx.REQUIRED])
  }));
}

function parseDose(value) {
  const n = numeric(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function parseStickerPayload(raw) {
  const text = clean(raw);
  if (!text) return null;
  try {
    const obj = JSON.parse(text);
    if (obj && typeof obj === "object") return {
      patient_name: clean(obj.patient_name ?? obj.patientName ?? obj.name),
      hn: clean(obj.hn ?? obj.HN),
      medicine_name: clean(obj.medicine_name ?? obj.medicineName ?? obj.medicine ?? obj.drug),
      dose_count: parseDose(obj.dose_count ?? obj.doseCount ?? obj.dose ?? obj.qty ?? obj.quantity)
    };
  } catch (_) {}
  if (text.includes("=") && /(?:^|[?&])(?:hn|patient_name|patientName|medicine_name|medicine|dose_count|dose|qty)=/i.test(text)) {
    try {
      const query = text.includes("?") ? text.slice(text.indexOf("?") + 1) : text;
      const params = new URLSearchParams(query);
      return {
        patient_name: clean(params.get("patient_name") || params.get("patientName") || params.get("name")),
        hn: clean(params.get("hn") || params.get("HN")),
        medicine_name: clean(params.get("medicine_name") || params.get("medicineName") || params.get("medicine") || params.get("drug")),
        dose_count: parseDose(params.get("dose_count") || params.get("doseCount") || params.get("dose") || params.get("qty") || params.get("quantity"))
      };
    } catch (_) {}
  }
  const parts = text.split("|").map(clean);
  if (parts.length >= 4) return {
    patient_name: parts[0], hn: parts[1], medicine_name: parts[2], dose_count: parseDose(parts[3])
  };
  return null;
}

function validateSticker(data) {
  if (!data) return "รูปแบบข้อมูล Sticker ไม่รองรับ";
  if (!data.patient_name) return "ไม่พบชื่อผู้รับบริการใน Sticker";
  if (!data.medicine_name) return "ไม่พบชื่อยา/วัคซีนใน Sticker";
  if (!data.dose_count) return "ไม่พบจำนวนโดสใน Sticker";
  return null;
}


const VACCINE_MOVEMENT_HEADERS = [
  "MOVEMENT_ID", "TYPE", "REF_NO", "DATE", "CODE", "NAME", "QTY", "UNIT",
  "LOT", "EXP", "TARGET", "USER", "TIME", "REMARK", "Location", "QRCODE"
];

function normalizeMovementType(value) {
  const type = clean(value).toUpperCase();
  if (["OUT", "ISSUE", "DISPENSE", "เบิก", "จ่าย", "เบิกจ่าย", "ตัดสต็อก"].includes(type)) return "OUT";
  if (["IN", "RECEIVE", "RECEIVED", "รับ", "รับเข้า", "เติมสต็อก"].includes(type)) return "IN";
  return type;
}

function normalizeDateKey(value) {
  const text = clean(value);
  if (!text) return "";
  let m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2,"0")}-${String(m[3]).padStart(2,"0")}`;
  m = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const a = Number(m[1]), b = Number(m[2]), y = m[3];
    if (a > 12) return `${y}-${String(b).padStart(2,"0")}-${String(a).padStart(2,"0")}`;
    return `${y}-${String(a).padStart(2,"0")}-${String(b).padStart(2,"0")}`;
  }
  return text;
}

function dateToSheetSerial(value) {
  const key = normalizeDateKey(value);
  if (!key) return "";
  const m = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) throw new Error(`วันที่ไม่ถูกต้อง: ${value}`);
  const utc = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(utc);
  if (d.getUTCFullYear() !== Number(m[1]) || d.getUTCMonth() !== Number(m[2]) - 1 || d.getUTCDate() !== Number(m[3])) {
    throw new Error(`วันที่ไม่ถูกต้อง: ${value}`);
  }
  return Math.floor(utc / 86400000) + 25569;
}

function getBangkokYearMonth(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return { year: values.year, yearMonth: `${values.year}${values.month}` };
}

function nextMovementSequence(rows, columnIndex, prefix, year) {
  const escaped = String(prefix).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`^${escaped}${year}\\d{2}-(\\d+)$`),
    new RegExp(`^${escaped}${year}-(\\d+)$`),
    new RegExp(`^${escaped}${year}(\\d{5})$`)
  ];
  let max = 0;
  for (const row of (rows || []).slice(1)) {
    const value = clean(row[columnIndex]);
    for (const pattern of patterns) {
      const match = value.match(pattern);
      if (match) { max = Math.max(max, Number(match[1]) || 0); break; }
    }
  }
  return max + 1;
}

function branchLocationMatches(location, branchName) {
  const loc = normalizeName(location);
  const branch = normalizeName(branchName);
  return Boolean(loc && branch && (loc === branch || loc.includes(branch)));
}

async function getBranchVaccineMovements(branchId) {
  const branches = await branchService.listBranches({ includeInactive: false });
  const branch = (branches || []).find(x => clean(x.BRANCH_ID) === clean(branchId));
  if (!branch) throw new Error("ไม่พบสาขาที่กำลังใช้งาน");
  const rows = await values("VACCINE_MOVEMENT!A:P");
  if (!rows.length) return { branch, rows: [], rawRows: rows };
  const headers = (rows[0] || []).map(x => clean(x).replace(/^\uFEFF/, "").toUpperCase());
  const index = Object.fromEntries(headers.map((h, i) => [h, i]));
  const required = ["MOVEMENT_ID", "TYPE", "REF_NO", "CODE", "NAME", "QTY", "UNIT", "LOT", "EXP", "LOCATION"];
  const missing = required.filter(h => index[h] === undefined);
  if (missing.length) {
    const error = new Error(`VACCINE_MOVEMENT ขาดคอลัมน์: ${missing.join(", ")}`);
    error.status = 409;
    throw error;
  }
  const mapped = rows.slice(1).map(row => ({
    movementId: clean(row[index.MOVEMENT_ID]), type: normalizeMovementType(row[index.TYPE]),
    refNo: clean(row[index.REF_NO]), date: clean(row[index.DATE]), code: clean(row[index.CODE]),
    name: clean(row[index.NAME]), qty: numeric(row[index.QTY]), unit: clean(row[index.UNIT]),
    lot: clean(row[index.LOT]), exp: clean(row[index.EXP]), target: clean(row[index.TARGET]),
    user: clean(row[index.USER]), time: clean(row[index.TIME]), remark: clean(row[index.REMARK]),
    location: clean(row[index.LOCATION]), qrcode: clean(row[index.QRCODE])
  })).filter(row => row.code && row.lot && branchLocationMatches(row.location, branch.BRANCH_NAME));
  return { branch, rows: mapped, rawRows: rows };
}

async function availableLots(medicineName, branchId) {
  const targetName = clean(medicineName);
  const targetNorm = normalizeName(targetName);
  if (!targetNorm) return [];
  const { rows } = await getBranchVaccineMovements(branchId);
  const incoming = rows.filter(row => row.type === "IN" && row.lot);
  const inventoryNames = [...new Set(incoming.map(row => row.name).filter(Boolean))];
  const aliases = new Map([
    [normalizeName("Vaccine Speeda (FS1)"), "6SPEED0001BG"],
    [normalizeName("Speeda FS1"), "6SPEED0001BG"],
    [normalizeName("Speeda"), "6SPEED0001BG"]
  ]);
  const aliasCode = aliases.get(targetNorm);
  let matchedNames = [];
  let matchedCodes = new Set();
  if (aliasCode) {
    matchedCodes.add(aliasCode);
    matchedNames = [...new Set(rows.filter(row => row.code === aliasCode).map(row => row.name))];
  } else {
    matchedNames = inventoryNames.filter(name => normalizeName(name) === targetNorm);
    if (!matchedNames.length) {
      const partial = inventoryNames.filter(name => {
        const normalized = normalizeName(name);
        return normalized.length >= 5 && targetNorm.length >= 5 &&
          (normalized.includes(targetNorm) || targetNorm.includes(normalized));
      });
      const bestLength = partial.length ? Math.max(...partial.map(name => normalizeName(name).length)) : 0;
      const best = partial.filter(name => normalizeName(name).length === bestLength);
      const bestCodes = new Set(rows.filter(row => best.includes(row.name)).map(row => row.code));
      if (bestCodes.size === 1) matchedNames = best;
    }
    matchedCodes = new Set(rows.filter(row => matchedNames.includes(row.name)).map(row => row.code));
  }
  if (!matchedCodes.size) return [];
  const groups = new Map();
  for (const row of rows) {
    if (!matchedCodes.has(row.code) || !row.lot || !["IN", "OUT"].includes(row.type)) continue;
    const key = `${row.code}||${row.lot}`;
    if (!groups.has(key)) groups.set(key, {
      code: row.code, name: row.name, lot: row.lot, exp: row.exp, unit: row.unit, balance: 0
    });
    const item = groups.get(key);
    if (row.exp) item.exp = row.exp;
    if (row.unit) item.unit = row.unit;
    if (row.type === "IN") item.balance += Math.abs(row.qty);
    if (row.type === "OUT") item.balance -= Math.abs(row.qty);
  }
  const outRefs = new Set(rows.filter(row => row.type === "OUT" && row.refNo).map(row => row.refNo));
  const details = await values("INVENTORY_DISPENSE!A:L").catch(() => []);
  if (details.length > 1) {
    const header = details[0].map(x => clean(x).toUpperCase());
    const idx = Object.fromEntries(header.map((h, i) => [h, i]));
    for (const row of details.slice(1)) {
      const refNo = clean(row[idx.REF_NO]);
      if (refNo && outRefs.has(refNo)) continue;
      const code = clean(row[idx.CODE]);
      const name = clean(row[idx.MEDICINE_NAME]);
      const lot = clean(row[idx.LOT]);
      if (!lot || (code ? !matchedCodes.has(code) : !matchedNames.some(x => normalizeName(x) === normalizeName(name)))) continue;
      const group = groups.get(`${code}||${lot}`) || [...groups.values()].find(x => x.lot === lot && (!code || x.code === code));
      if (group) group.balance -= numeric(row[idx.DOSE_COUNT]);
    }
  }
  return [...groups.values()].filter(item => item.balance > 0)
    .sort((a, b) => String(a.lot).localeCompare(String(b.lot), undefined, { numeric: true }));
}

async function getVaccineSheetIds(sheets) {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: getSpreadsheetId(), fields: "sheets(properties(sheetId,title))"
  });
  const map = new Map((meta.data.sheets || []).map(x => [x.properties.title, x.properties.sheetId]));
  const movementId = map.get("VACCINE_MOVEMENT");
  const detailId = map.get("INVENTORY_DISPENSE");
  if (movementId === undefined || detailId === undefined) throw new Error("ไม่พบชีต VACCINE_MOVEMENT หรือ INVENTORY_DISPENSE");
  return { movementId, detailId };
}

function withSessionLock(key, task) {
  const previous = sessionLocks.get(key) || Promise.resolve();
  const current = previous.then(task, task);
  sessionLocks.set(key, current.catch(() => undefined));
  return current;
}
function withDispenseLock(task) {
  const current = dispenseQueue.then(task, task);
  dispenseQueue = current.catch(() => undefined);
  return current;
}

router.get("/session/new", requireAuth, requireBranch, async (req, res) => {
  try {
    const now = new Date();
    const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(now).replace(/-/g, "");
    const sessionId = `S${ymd}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    return res.json({
      success: true,
      session_id: sessionId,
      branch_id: req.authBranchId,
      user: {
        user_id: req.authUser.userId,
        full_name: req.authUser.fullName || req.authUser.username,
        username: req.authUser.username,
        role: req.authUser.role
      }
    });
  } catch (err) {
    console.error("ESTOCKSCAN SESSION CREATE:", err);
    return res.status(500).json({ success: false, message: "สร้าง SESSION ไม่สำเร็จ" });
  }
});

router.get("/movement/:id", requireAuth, requireBranch, async (req, res) => {
  try {
    const id = clean(req.params.id).toUpperCase();
    const rows = await getBranchMovements(req.authBranchId);
    const row = rows.find(r => clean(r.MOVEMENT_ID).toUpperCase() === id);
    if (!row || clean(row.TYPE).toUpperCase() !== "IN") {
      return res.status(404).json({ success: false, code: "MOVEMENT_NOT_FOUND", message: "ไม่พบ Sticker ในสาขาที่กำลังใช้งาน" });
    }
    const sessionId = clean(req.query.session_id);
    if (sessionId) {
      await ensureHeaders("COUNT_SESSION", COUNT_HEADERS);
      const saved = await values("COUNT_SESSION!A:H");
      const duplicate = saved.slice(1).some(r =>
        clean(r[0]) === sessionId && clean(r[1]).toUpperCase() === id && clean(r[7]) === clean(req.authBranchId)
      );
      if (duplicate) return res.status(409).json({ success: false, code: "DUPLICATE_SCAN", message: "Sticker นี้ถูกบันทึกใน SESSION นี้แล้ว" });
    }
    return res.json({
      success: true,
      data: {
        movement_id: clean(row.MOVEMENT_ID), code: clean(row.CODE), name: clean(row.NAME),
        qty: numeric(row.QTY), unit: clean(row.UNIT), lot: clean(row.LOT), exp: clean(row.EXP),
        branch_id: clean(row.BRANCH_ID)
      }
    });
  } catch (err) {
    console.error("ESTOCKSCAN MOVEMENT LOOKUP:", err);
    return res.status(err.status || 500).json({ success: false, message: err.message || "ค้นหา Sticker ไม่สำเร็จ" });
  }
});

router.get("/session/:sid", requireAuth, requireBranch, async (req, res) => {
  try {
    await ensureHeaders("COUNT_SESSION", COUNT_HEADERS);
    const rows = await values("COUNT_SESSION!A:H");
    const data = rows.slice(1).filter(r => clean(r[0]) === clean(req.params.sid) && clean(r[7]) === clean(req.authBranchId))
      .map(r => ({ session_id: clean(r[0]), movement_id: clean(r[1]), code: clean(r[2]), name: clean(r[3]), qty: numeric(r[4]), user: clean(r[5]), time: clean(r[6]), branch_id: clean(r[7]) }));
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, message: err.message || "อ่าน SESSION ไม่สำเร็จ" });
  }
});

router.post("/complete", requireAuth, requireBranch, async (req, res) => {
  const sessionId = clean(req.body?.session_id);
  const branchId = clean(req.authBranchId);
  return withSessionLock(`${sessionId}:${branchId}`, async () => {
    try {
      if (!sessionId) return res.status(400).json({ success: false, message: "ไม่พบ SESSION_ID" });
      const items = Array.isArray(req.body?.items) ? req.body.items : [];
      if (!items.length) return res.status(400).json({ success: false, message: "ไม่มีรายการตรวจนับ" });
      const ids = items.map(x => clean(x.movement_id).toUpperCase());
      if (ids.some(x => !x) || new Set(ids).size !== ids.length) {
        return res.status(409).json({ success: false, code: "DUPLICATE_SCAN", message: "พบ Sticker ซ้ำในรายการที่ส่ง กรุณาตรวจสอบก่อนบันทึก" });
      }
      for (const item of items) {
        if (clean(item.branch_id) && clean(item.branch_id) !== branchId) {
          return res.status(403).json({ success: false, message: "รายการมี BRANCH_ID ไม่ตรงกับสาขาที่ Login" });
        }
        const qty = Number(item.qty);
        if (!Number.isInteger(qty) || qty < 1) return res.status(400).json({ success: false, message: "จำนวนตรวจนับต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป" });
      }

      await ensureHeaders("COUNT_SESSION", COUNT_HEADERS);
      await ensureHeaders("SESSION_RESULT", RESULT_HEADERS);
      const [countRows, resultRows, movementRows] = await Promise.all([
        values("COUNT_SESSION!A:H"), values("SESSION_RESULT!A:F"), getBranchMovements(branchId)
      ]);

      const existingResult = resultRows.slice(1).filter(r => clean(r[0]) === sessionId && clean(r[5]) === branchId);
      if (existingResult.length) {
        return res.json({
          success: true, already_completed: true, branch_id: branchId,
          result: existingResult.map(r => ({ session_id: clean(r[0]), code: clean(r[1]), required: numeric(r[2]), actual: numeric(r[3]), diff: numeric(r[4]), branch_id: clean(r[5]) }))
        });
      }

      const movementById = new Map(movementRows.map(r => [clean(r.MOVEMENT_ID).toUpperCase(), r]));
      const existingForSession = countRows.slice(1).filter(r => clean(r[0]) === sessionId && clean(r[7]) === branchId);
      const existingIds = new Set(existingForSession.map(r => clean(r[1]).toUpperCase()));
      const newRows = [];
      for (const item of items) {
        const id = clean(item.movement_id).toUpperCase();
        const movement = movementById.get(id);
        if (!movement || clean(movement.TYPE).toUpperCase() !== "IN") {
          return res.status(404).json({ success: false, code: "MOVEMENT_NOT_FOUND", message: `ไม่พบ Sticker ${id} ในสาขาที่กำลังใช้งาน` });
        }
        if (existingIds.has(id)) continue; // safe retry: never append same sticker twice
        if (clean(item.code) && clean(item.code).toUpperCase() !== clean(movement.CODE).toUpperCase()) {
          return res.status(409).json({ success: false, message: `ข้อมูล CODE ของ Sticker ${id} ไม่ตรงกับ Inventory` });
        }
        newRows.push([
          sessionId, id, clean(movement.CODE), clean(movement.NAME),
          Number(item.qty), clean(req.authUser.fullName || req.authUser.username),
          new Date().toISOString(), branchId
        ]);
      }

      if (newRows.length) {
        const saved = await appendRows("COUNT_SESSION", "COUNT_SESSION!A:H", newRows);
        if (!saved.updatedRange || saved.updatedRows !== newRows.length) {
          return res.status(502).json({ success: false, code: "COUNT_SAVE_UNVERIFIED", message: "Google Sheets ยังไม่ยืนยันการบันทึก COUNT_SESSION ครบถ้วน กรุณาตรวจสอบชีตก่อนลองใหม่" });
        }
      }

      const refreshed = await values("COUNT_SESSION!A:H");
      const sessionCounts = refreshed.slice(1).filter(r => clean(r[0]) === sessionId && clean(r[7]) === branchId);
      const actualByCode = new Map();
      for (const row of sessionCounts) actualByCode.set(clean(row[2]), (actualByCode.get(clean(row[2])) || 0) + numeric(row[4]));

      const master = await getInventoryMaster();
      const result = master.map(item => {
        const actual = actualByCode.get(item.code) || 0;
        return [sessionId, item.code, item.required, actual, actual - item.required, branchId];
      });

      const currentResultRows = await values("SESSION_RESULT!A:F");
      const completed = currentResultRows.slice(1).some(r => clean(r[0]) === sessionId && clean(r[5]) === branchId);
      if (!completed && result.length) {
        const savedResult = await appendRows("SESSION_RESULT", "SESSION_RESULT!A:F", result);
        if (!savedResult.updatedRange || savedResult.updatedRows !== result.length) {
          return res.status(502).json({ success: false, code: "RESULT_SAVE_UNVERIFIED", message: "บันทึก COUNT_SESSION แล้ว แต่ SESSION_RESULT ยังไม่ยืนยัน กรุณากดสรุปอีกครั้ง ระบบจะไม่เพิ่มรายการสแกนซ้ำ" });
        }
      }

      return res.json({
        success: true, branch_id: branchId, saved: newRows.length,
        duplicate_skipped: items.length - newRows.length,
        result: result.map(r => ({ session_id: r[0], code: r[1], required: r[2], actual: r[3], diff: r[4], branch_id: r[5] }))
      });
    } catch (err) {
      console.error("ESTOCKSCAN SESSION COMPLETE:", err);
      return res.status(err.status || 500).json({ success: false, message: err.message || "บันทึก SESSION ไม่สำเร็จ" });
    }
  });
});

router.get("/dispense/lookup/:id", requireAuth, requireBranch, async (req, res) => {
  try {
    const raw = clean(req.params.id);
    const data = parseStickerPayload(raw);
    const error = validateSticker(data);
    if (error) return res.status(422).json({ success: false, code: "INVALID_STICKER", message: error });
    return res.json({ success: true, data: { ...data, qr_raw: raw } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "อ่าน Sticker ไม่สำเร็จ" });
  }
});

router.get("/dispense/lots", requireAuth, requireBranch, async (req, res) => {
  try {
    const name = clean(req.query.medicine_name);
    if (!name) return res.status(400).json({ success: false, message: "กรุณาระบุชื่อยา/วัคซีน" });
    const lots = await availableLots(name, req.authBranchId);
    return res.json({ success: true, data: lots });
  } catch (err) {
    console.error("ESTOCKSCAN DISPENSE LOTS:", err);
    return res.status(err.status || 500).json({ success: false, message: err.message || "ค้นหา Lot ไม่สำเร็จ" });
  }
});


router.post("/dispense", requireAuth, requireBranch, async (req, res) => {
  return withDispenseLock(async () => {
    try {
      const data = {
        patient_name: clean(req.body?.patient_name),
        hn: clean(req.body?.hn),
        medicine_name: clean(req.body?.medicine_name),
        dose_count: parseDose(req.body?.dose_count),
        lot: clean(req.body?.lot)
      };
      const validationError = validateSticker(data);
      if (validationError) return res.status(400).json({ success: false, message: validationError });
      if (!data.lot) return res.status(400).json({ success: false, message: "กรุณาเลือก Lot" });

      await ensureHeaders("VACCINE_MOVEMENT", VACCINE_MOVEMENT_HEADERS);
      await ensureHeaders("INVENTORY_DISPENSE", DISPENSE_DETAIL_HEADERS);
      const { branch, rows: branchMovements, rawRows: movementRows } =
        await getBranchVaccineMovements(req.authBranchId);

      const requestId = clean(req.body?.request_id) || `DO-${crypto.randomUUID()}`;
      const detailRows = await values("INVENTORY_DISPENSE!A:L");
      const detailHeader = (detailRows[0] || []).map(x => clean(x).toUpperCase());
      const detailIndex = Object.fromEntries(detailHeader.map((h, i) => [h, i]));
      const previous = detailRows.slice(1).find(row => clean(row[detailIndex.DISPENSE_ID]) === requestId);
      if (previous) {
        const previousRef = clean(previous[detailIndex.REF_NO]);
        const previousMovement = branchMovements.find(row =>
          row.refNo === previousRef && row.type === "OUT"
        );
        if (!previousMovement) {
          return res.status(409).json({
            success: false, code: "DISPENSE_REPLAY_INCOMPLETE",
            message: "พบคำขอจ่ายเดิมใน INVENTORY_DISPENSE แต่ไม่พบรายการ OUT ใน VACCINE_MOVEMENT ของสาขานี้ กรุณาตรวจสอบก่อนทำซ้ำ"
          });
        }
        return res.json({
          success: true, already_saved: true, saved_sheet: "VACCINE_MOVEMENT + INVENTORY_DISPENSE",
          stock_ledger: "VACCINE_MOVEMENT", detail_log: "INVENTORY_DISPENSE",
          movement_id: previousMovement.movementId, ref_no: previousRef
        });
      }

      const lots = await availableLots(data.medicine_name, req.authBranchId);
      const selected = lots.find(item => clean(item.lot) === data.lot);
      if (!selected) {
        return res.status(409).json({
          success: false, code: "LOT_NOT_AVAILABLE",
          message: "ไม่พบ Lot ที่มี Stock สำหรับรายการนี้ กรุณาตรวจชื่อวัคซีนใน VACCINE_MOVEMENT"
        });
      }
      if (data.dose_count > selected.balance) {
        return res.status(409).json({
          success: false, code: "INSUFFICIENT_STOCK",
          message: `Lot ${selected.lot} คงเหลือ ${selected.balance} แต่ต้องจ่าย ${data.dose_count}`
        });
      }
      if (!selected.exp) {
        return res.status(409).json({ success: false, code: "LOT_EXP_MISSING", message: "Lot ที่เลือกไม่มีข้อมูล EXP ใน VACCINE_MOVEMENT" });
      }

      const { year, yearMonth } = getBangkokYearMonth();
      const movementSequence = nextMovementSequence(movementRows, 0, "VMI", year);
      const detailSequence = nextMovementSequence(detailRows, 1, "RCOUT", year);
      const movementRefSequence = nextMovementSequence(movementRows, 2, "RCOUT", year);
      const sequence = Math.max(detailSequence, movementRefSequence);
      const movementId = `VMI${yearMonth}-${String(movementSequence).padStart(5, "0")}`;
      const refNo = `RCOUT${yearMonth}-${String(sequence).padStart(5, "0")}`;
      const now = new Date();
      const timestamp = now.toISOString();
      const movementDate = dateToSheetSerial(now.toISOString().slice(0, 10));
      const expSerial = dateToSheetSerial(selected.exp);
      const patientTarget = [data.patient_name, data.hn].filter(Boolean).join(" / ");
      const userName = clean(req.authUser?.fullName || req.authUser?.username);
      const movementQrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(movementId)}`;

      const movementRow = [
        movementId, "OUT", refNo, movementDate, selected.code, selected.name || data.medicine_name,
        data.dose_count, selected.unit || "dose", selected.lot, expSerial, patientTarget,
        userName, timestamp, "", branch.BRANCH_NAME, movementQrCode
      ];
      const detailRow = [
        requestId, refNo, data.patient_name, data.hn, data.medicine_name,
        data.dose_count, selected.lot, expSerial, selected.code, userName,
        timestamp, clean(req.body?.qr_raw)
      ];

      const sheets = await getSheets();
      const { movementId: movementSheetId, detailId: detailSheetId } = await getVaccineSheetIds(sheets);
      const cell = value => ({
        userEnteredValue: typeof value === "number"
          ? { numberValue: value }
          : { stringValue: String(value ?? "") }
      });
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: getSpreadsheetId(),
        requestBody: {
          requests: [
            {
              appendCells: {
                sheetId: movementSheetId,
                rows: [{ values: movementRow.map(cell) }],
                fields: "userEnteredValue"
              }
            },
            {
              appendCells: {
                sheetId: detailSheetId,
                rows: [{ values: detailRow.map(cell) }],
                fields: "userEnteredValue"
              }
            }
          ]
        }
      });

      return res.json({
        success: true,
        saved_sheet: "VACCINE_MOVEMENT + INVENTORY_DISPENSE",
        stock_ledger: "VACCINE_MOVEMENT",
        detail_log: "INVENTORY_DISPENSE",
        already_saved: false,
        movement_id: movementId,
        ref_no: refNo,
        data: {
          ...data, code: selected.code, lot: selected.lot, exp: selected.exp,
          balance_before: selected.balance,
          balance_after: selected.balance - data.dose_count
        }
      });
    } catch (err) {
      console.error("ESTOCKSCAN DISPENSE SAVE:", err);
      return res.status(err.status || 500).json({ success: false, message: err.message || "บันทึกการจ่ายยาไม่สำเร็จ" });
    }
  });
});

module.exports = router;
