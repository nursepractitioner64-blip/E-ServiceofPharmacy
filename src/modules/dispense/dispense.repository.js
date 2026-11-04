const {
  getSheets,
  readRows
} = require("../../config/google");

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

// =====================
// SAFE VALUE
// =====================
function safe(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

// =====================
// NORMALIZE ROW (สำคัญมาก FIX BUG CODE ว่าง)
// =====================
function norm(r) {
  return {
    CODE:
      r.CODE || r.Code || r["CODE"] || r["Code"] || "",

    NAME:
      r.NAME || r.Name || r["NAME"] || r["Name"] || "",

    UNIT:
      r.UNIT || r.Unit || r["UNIT"] || r["Unit"] || "",

    LOT:
      r.LOT || r.Lot || r["LOT"] || r["Lot"] || "",

    EXP:
      r.EXP || r.Exp || r["EXP"] || r["Exp"] || ""
  };
}

// =====================
// INSERT DISPENSE LOG
// =====================
async function insertDispenseLog(rows) {

  if (!rows || !rows.length) return;

  const sheets = await getSheets();

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "DISPENSE_LOG!A:L",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: rows
    }
  });

}

// =====================
// INSERT STOCK MOVEMENT
// =====================
async function insertStockMovement(rows) {

  if (!rows || !rows.length) return;

  const sheets = await getSheets();

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "STOCK_MOVEMENT!A:O",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: rows
    }
  });

}

// =====================
// DRUG MASTER (LEGACY)
// =====================
async function getDrugMaster() {
  return await readRows("DRUG_MASTER");
}

// =====================
// DRUG RECEIVE (FIXED)
// =====================
function cleanRow(r) {
  const out = {};
  for (const k in r) {
    out[String(k).trim()] = r[k];
  }
  return out;
}

async function getDrugReceive() {

  const rows = await readRows("DRUG_RECEIVE");

  return rows
    .map(cleanRow)   // 🔥 ใช้ตัวเดียวพอ
    .map(r => ({

      CODE: r.CODE || r.Code || "",
      NAME: r.NAME || r.Name || "",
      UNIT: r.UNIT || r.Unit || "",
      LOT: r.LOT || r.Lot || "",
      EXP: r.EXP || r.Exp || ""

    }))
    .filter(r => r.CODE);
}

// =====================
// PERSON
// =====================
async function getPerson() {
  return await readRows("PERSON");
}

// =====================
// ADDRESS
// =====================
async function getAddress() {
  return await readRows("ADDRESS");
}

// =====================
// LOCATION MASTER
// =====================
async function getLocationMaster() {

  const rows = await readRows("CHANGWAT_MASTER");

  return rows.map(r => ({
    code: safe(
      r["Location Code"] ||
      r["LOCATION_CODE"] ||
      r["LOCATIONCODE"]
    ),
    name: safe(
      r["Location"] ||
      r["LOCATION"]
    )
  })).filter(x => x.code);
}

// =====================
// STOCK MOVEMENTS
// =====================
async function getStockMovements() {

  const sheets = await getSheets();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "STOCK_MOVEMENT!A:O"
  });

  const rows = res.data.values || [];
  const dataRows = rows.slice(1);

  return dataRows.map(r => ({
    movementId: r[0] || "",
    type: r[1] || "",
    refNo: r[2] || "",
    date: r[3] || "",
    code: r[4] || "",
    name: r[5] || "",
    qty: r[6] || "",
    unit: r[7] || "",
    lot: r[8] || "",
    exp: r[9] || "",
    target: r[10] || "",
    user: r[11] || "",
    time: r[12] || "",
    branchId: r[13] || "",
location: r[14] || "",
qrcode: r[15] || "",
containerId: r[16] || "",
containerQr: r[17] || ""
  }));
}

// =====================
// DISPENSE LOGS
// =====================
async function getDispenseLogs() {

  const sheets = await getSheets();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "DISPENSE_LOG!A:L"
  });

  const rows = res.data.values || [];
  const dataRows = rows.slice(1);

  return dataRows.map(r => ({
    refNo: r[0] || "",
    date: r[1] || "",
    type: r[2] || "",
    code: r[3] || "",
    name: r[4] || "",
    qty: r[5] || "",
    unit: r[6] || "",
    lot: r[7] || "",
    exp: r[8] || "",
    target: r[9] || "",
    user: r[10] || "",
    time: r[11] || ""
  }));
}


async function updateDispense(
  refNo,
  body
) {

  const sheets =
    await getSheets();

  const res =
    await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "DISPENSE_LOG!A:L"
    });

  const rows =
    res.data.values || [];

  const idx =
    rows.findIndex(
      r => r[0] === refNo
    );

  if (idx < 1)
    throw new Error(
      "REF_NO not found"
    );

  rows[idx] = [
    refNo,
    body.date,
    "OUT",
    body.code,
    body.name,
    body.qty,
    body.unit,
    body.lot,
    body.exp,
    body.target,
    body.user,
    new Date().toISOString()
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `DISPENSE_LOG!A${idx+1}:L${idx+1}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [rows[idx]]
    }
  });

}


async function updateStockMovement(
  refNo,
  body
) {

  const sheets =
    await getSheets();

  const res =
    await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "STOCK_MOVEMENT!A:O"
    });

  const rows =
    res.data.values || [];

  const idx =
    rows.findIndex(
      r => r[2] === refNo
    );

  if (idx < 1)
    throw new Error(
      "REF_NO not found"
    );

  rows[idx][3] = body.date;
  rows[idx][4] = body.code;
  rows[idx][5] = body.name;
  rows[idx][6] = body.qty;
  rows[idx][7] = body.unit;
  rows[idx][8] = body.lot;
  rows[idx][9] = body.exp;
  rows[idx][10] = body.target;
  rows[idx][11] = body.user;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `STOCK_MOVEMENT!A${idx+1}:O${idx+1}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [rows[idx]]
    }
  });

}


// =====================
// DELETE DISPENSE LOG
// =====================
async function deleteDispense(refNo) {

  const sheets =
    await getSheets();

  const res =
    await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "DISPENSE_LOG!A:L"
    });

  const rows =
    res.data.values || [];

  if (rows.length <= 1)
    return;

  const header = rows[0];

  const data =
    rows
      .slice(1)
      .filter(r => r[0] !== refNo);

  await sheets.spreadsheets.values.clear({
    spreadsheetId: SHEET_ID,
    range: "DISPENSE_LOG!A:L"
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: "DISPENSE_LOG!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        header,
        ...data
      ]
    }
  });

}

// =====================
// DELETE STOCK MOVEMENT
// =====================
async function deleteStockMovement(refNo) {

  const sheets =
    await getSheets();

  const res =
    await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "STOCK_MOVEMENT!A:O"
    });

  const rows =
    res.data.values || [];

  if (rows.length <= 1)
    return;

  const header = rows[0];

  const data =
    rows
      .slice(1)
      .filter(r => r[2] !== refNo);

  await sheets.spreadsheets.values.clear({
    spreadsheetId: SHEET_ID,
    range: "STOCK_MOVEMENT!A:O"
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: "STOCK_MOVEMENT!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        header,
        ...data
      ]
    }
  });

}



// =====================================================
// INVENTORY DISPENSE (INVENTORY_MOVEMENT A:R)
// The inventory dispense screen must use the same ledger
// as receive-stock so LOT / EXP / BRANCH / CONTAINER balances stay aligned.
// =====================================================
const INVENTORY_SHEET = "INVENTORY_MOVEMENT";

function cleanText(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

async function getInventoryMovements() {
  // Read by fixed column positions, matching GET /api/inventory-movement.
  // readRows() uses raw header text as object keys; a hidden space/BOM in a
  // header can make BRANCH_ID / CODE / LOT / EXP silently become empty.
  const sheets = await getSheets();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${INVENTORY_SHEET}!A:R`,
    valueRenderOption: "FORMATTED_VALUE"
  });
  const values = response.data.values || [];

  return values.slice(1).map(row => ({
    MOVEMENT_ID: cleanText(row[0]),
    TYPE: cleanText(row[1]).toUpperCase(),
    REF_NO: cleanText(row[2]),
    DATE: cleanText(row[3]),
    CODE: cleanText(row[4]).toUpperCase(),
    NAME: cleanText(row[5]),
    QTY: Number(String(row[6] ?? "0").replace(/,/g, "")) || 0,
    UNIT: cleanText(row[7]),
    LOT: cleanText(row[8]),
    EXP: cleanText(row[9]),
    TARGET: cleanText(row[10]),
    USER: cleanText(row[11]),
    TIME: cleanText(row[12]),
    BRANCH_ID: cleanText(row[13]),
    LOCATION: cleanText(row[14]),
    QRCODE: cleanText(row[15]),
    CONTAINER_ID: cleanText(row[16]),
    CONTAINER_QR: cleanText(row[17])
  })).filter(row => row.MOVEMENT_ID || row.REF_NO || row.CODE);
}

async function getInventoryByRefNo(refNo, branchId = "") {
  const rows = await getInventoryMovements();
  return rows.find(row =>
    row.REF_NO === cleanText(refNo) &&
    row.TYPE === "OUT" &&
    (!branchId || row.BRANCH_ID === cleanText(branchId))
  ) || null;
}

function normalizeDispenseCode(value, lot, exp) {
  let code = cleanText(value).toUpperCase();
  if (!code.includes("|")) return code;

  // Backward compatibility for older clients that sent CODE|LOT|EXP.
  const parts = code.split("|");
  if (
    parts.length >= 3 &&
    cleanText(parts[1]) === cleanText(lot) &&
    normalizeDateValue(parts.slice(2).join("|")) === normalizeDateValue(exp)
  ) {
    return cleanText(parts[0]).toUpperCase();
  }
  return code;
}

async function createInventoryDispense(data = {}, context = {}) {
  const sheets = await getSheets();
  const branchId = cleanText(context.branchId);
  const location = cleanText(context.location);
  const lot = cleanText(data.lot);
  const exp = normalizeDateValue(data.exp);
  const code = normalizeDispenseCode(data.code, lot, exp);
  const qty = Number(data.qty);

  if (!branchId) throw new Error("ไม่พบสาขาที่ปฏิบัติงาน กรุณาเลือกสาขาก่อนบันทึก");
  if (!code) throw new Error("กรุณาเลือกรหัสยา");
  if (!lot || !exp) throw new Error("กรุณาระบุ LOT และวันหมดอายุ");
  if (!Number.isFinite(qty) || qty <= 0) throw new Error("จำนวนจ่ายต้องมากกว่า 0");
  if (!cleanText(data.target || data.supplier)) throw new Error("กรุณาระบุปลายทางการจ่าย");

  const { withSequenceLock } = require("../../utils/running/sequence-lock");
  const { getBangkokDateParts } = require("../../utils/running/bangkok-date");
  const { maxAnnualSequence, formatAnnualNumber } = require("../../utils/running/annual-number-format");

  return withSequenceLock(`INVENTORY_MOVEMENT:dispense:${branchId}`, async () => {
    // Re-read latest movements under the lock, exactly as Vaccine Stock does.
    const latest = await getInventoryMovements();
    const matching = latest.filter(row =>
      cleanText(row.BRANCH_ID) === branchId &&
      cleanText(row.CODE).toUpperCase() === code &&
      cleanText(row.LOT) === lot &&
      normalizeDateValue(row.EXP) === exp &&
      (row.TYPE === "IN" || row.TYPE === "OUT")
    );

    const balance = matching.reduce((total, row) => {
      const movementQty = Math.abs(Number(row.QTY || 0));
      if (!Number.isFinite(movementQty)) return total;
      if (row.TYPE === "IN") return total + movementQty;
      if (row.TYPE === "OUT") return total - movementQty;
      return total;
    }, 0);

    if (balance <= 0 || qty > balance) {
      const sameBranchCodeLot = latest.filter(row =>
        cleanText(row.BRANCH_ID) === branchId &&
        cleanText(row.CODE).toUpperCase() === code &&
        cleanText(row.LOT) === lot
      );
      console.error("[DISPENSE STOCK CHECK]", {
        branchId, code, lot, requestedExp: exp,
        sameBranchCodeLot: sameBranchCodeLot.map(row => ({
          type: row.TYPE, qty: row.QTY, exp: row.EXP,
          normalizedExp: normalizeDateValue(row.EXP),
          branchId: row.BRANCH_ID
        }))
      });
      throw new Error(`สต๊อกไม่เพียงพอ LOT ${lot} (คงเหลือ ${Math.max(0, balance)} ${cleanText(data.unit)})`);
    }

    const source = matching.find(row => row.TYPE === "IN" && row.CONTAINER_ID) ||
      matching.find(row => row.TYPE === "IN") || {};
    const now = new Date();
    const { yyyy: year } = getBangkokDateParts(now);
    const movementId = formatAnnualNumber(
      "MOVID",
      maxAnnualSequence(latest.map(row => row.MOVEMENT_ID), "MOVID", year) + 1,
      now
    );
    const refNo = formatAnnualNumber(
      "RCOUT",
      maxAnnualSequence(latest.map(row => row.REF_NO), "RCOUT", year) + 1,
      now
    );

    const row = [
      movementId, "OUT", refNo,
      cleanText(data.date) || now.toISOString().slice(0, 10),
      cleanText(data.code), cleanText(data.name), qty, cleanText(data.unit), lot,
      cleanText(data.exp), cleanText(data.target || data.supplier),
      cleanText(context.user), now.toISOString(), branchId,
      location || cleanText(source.LOCATION),
      cleanText(source.QRCODE), cleanText(source.CONTAINER_ID), cleanText(source.CONTAINER_QR)
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${INVENTORY_SHEET}!A:R`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] }
    });

    return { movementId, refNo, data: row, remaining: balance - qty };
  });
}



function normalizeDateValue(value) {
  const raw = cleanText(value);
  if (!raw) return "";

  // ISO date / datetime: YYYY-MM-DD...
  let match = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) {
    let year = Number(match[1]);
    if (year > 2400) year -= 543;
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return raw;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  // Match Vaccine Stock convention: slash dates are MM/DD/YYYY.
  match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match) {
    const month = Number(match[1]);
    const day = Number(match[2]);
    let year = Number(match[3]);
    if (year > 2400) year -= 543;
    if (month < 1 || month > 12 || day < 1 || day > 31) return raw;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    let year = parsed.getFullYear();
    if (year > 2400) year -= 543;
    return `${year}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
  }
  return raw;
}

async function updateInventoryDispense(refNo, data = {}, context = {}) {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID, range: `${INVENTORY_SHEET}!A:R`
  });
  const rows = res.data.values || [];
  const index = rows.findIndex((r, i) => i > 0 && cleanText(r[2]) === cleanText(refNo) && cleanText(r[1]).toUpperCase() === "OUT" && cleanText(r[13]) === cleanText(context.branchId));
  if (index < 1) throw new Error("ไม่พบรายการจ่ายยาในสาขาที่เลือก");
  const old = rows[index];
  const qty = Number(data.qty);
  if (!Number.isFinite(qty) || qty <= 0) throw new Error("จำนวนจ่ายต้องมากกว่า 0");
  const nextLot = cleanText(data.lot || old[8]);
  const nextExp = normalizeDateValue(data.exp || old[9]);
  const nextCode = normalizeDispenseCode(data.code || old[4], nextLot, nextExp);
  const latest = await getInventoryMovements();
  const available = latest.filter(r => r.BRANCH_ID === cleanText(context.branchId) && r.CODE === nextCode && r.LOT === nextLot && normalizeDateValue(r.EXP) === nextExp)
    .reduce((sum, r) => sum + (r.TYPE === "IN" ? Number(r.QTY || 0) : r.TYPE === "OUT" && r.REF_NO !== refNo ? -Number(r.QTY || 0) : 0), 0);
  if (qty > available) throw new Error(`สต๊อกไม่เพียงพอ (คงเหลือ ${available})`);
  const updated = [
    old[0], "OUT", old[2], cleanText(data.date || old[3]),
    nextCode, cleanText(data.name || old[5]), qty,
    cleanText(data.unit || old[7]), nextLot, nextExp,
    cleanText(data.target || data.supplier || old[10]), cleanText(context.user || old[11]),
    new Date().toISOString(), old[13], old[14], old[15], old[16], old[17]
  ];
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID, range: `${INVENTORY_SHEET}!A${index + 1}:R${index + 1}`,
    valueInputOption: "USER_ENTERED", requestBody: { values: [updated] }
  });
  return { refNo, data: updated };
}

async function deleteInventoryDispense(refNo, context = {}) {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID, range: `${INVENTORY_SHEET}!A:R`
  });
  const rows = res.data.values || [];
  const index = rows.findIndex((r, i) => i > 0 && cleanText(r[2]) === cleanText(refNo) && cleanText(r[1]).toUpperCase() === "OUT" && cleanText(r[13]) === cleanText(context.branchId));
  if (index < 1) throw new Error("ไม่พบรายการจ่ายยาในสาขาที่เลือก");
  // Delete only the target row; preserve all other branches and movement history.
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { requests: [{
      deleteDimension: {
        range: { sheetId: await getSheetId(sheets, INVENTORY_SHEET), dimension: "ROWS", startIndex: index, endIndex: index + 1 }
      }
    }] }
  });
  return { refNo };
}

async function getSheetId(sheets, title) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const sheet = (meta.data.sheets || []).find(s => s.properties?.title === title);
  if (!sheet) throw new Error(`ไม่พบชีต ${title}`);
  return sheet.properties.sheetId;
}


// =====================
// EXPORT
// =====================
module.exports = {

  insertDispenseLog,
  insertStockMovement,

  updateDispense,
  updateStockMovement,

  deleteDispense,
  deleteStockMovement,

  getDrugMaster,
  getDrugReceive,
  getPerson,
  getAddress,
  getLocationMaster,
  getStockMovements,
  getDispenseLogs,
  getInventoryMovements,
  getInventoryByRefNo,
  createInventoryDispense,
  updateInventoryDispense,
  deleteInventoryDispense

};