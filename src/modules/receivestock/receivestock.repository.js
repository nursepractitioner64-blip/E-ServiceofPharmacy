const {
  readRows,
  appendRow
} = require("../../config/google");

const SHEET = "INVENTORY_MOVEMENT";
const MASTER_SHEET = "INVENTORY_MASTER";

function clean(v) {
  return v === undefined || v === null ? "" : String(v).trim();
}

function normalizeMovement(row = {}) {
  return {
    movementId: clean(row.MOVEMENT_ID ?? row.movement_id),
    type: clean(row.TYPE ?? row.type).toUpperCase(),
    refNo: clean(row.REF_NO ?? row.refNo ?? row.receivestockNo),
    dateIn: clean(row.DATE ?? row.date ?? row.dateIn),
    code: clean(row.CODE ?? row.code),
    name: clean(row.NAME ?? row.name),
    qty: Number(row.QTY ?? row.qty ?? 0),
    unit: clean(row.UNIT ?? row.unit),
    lot: clean(row.LOT ?? row.lot),
    exp: clean(row.EXP ?? row.exp),
    supplier: clean(row.TARGET ?? row.target ?? row.supplier),
    user: clean(row.USER ?? row.user),
    time: clean(row.TIME ?? row.time),
    remark: clean(row.REMARK ?? row.remark),
    location: clean(row.LOCATION ?? row.location),
    qrcode: clean(row.QRCODE ?? row.qrcode)
  };
}

/* =====================================================
   GET INVENTORY MASTER
   ===================================================== */
async function getInventoryMaster() {
  const rows = await readRows(MASTER_SHEET);

  return (rows || [])
    .map(r => ({
      code: clean(r.CODE ?? r.Code ?? r.code),
      name: clean(r.NAME ?? r.Name ?? r.name),
      unit: clean(r.UNIT ?? r.Unit ?? r.unit)
    }))
    .filter(r => r.code);
}

/* =====================================================
   GET ALL RECEIVE STOCK
   ===================================================== */
async function getAllReceiveStock() {
  const rows = await readRows(SHEET);

  return (rows || [])
    .map(normalizeMovement)
    .filter(r => r.type === "IN");
}

/* =====================================================
   NEXT MOVEMENT ID
   ===================================================== */
async function getNextMovementId() {
  const rows = await readRows(SHEET);

  let max = 0;
  const year = new Date().getFullYear();

  for (const row of rows || []) {
    const id = clean(row.MOVEMENT_ID ?? row.movement_id);
    const match = id.match(/^MOVID(\d{4})-(\d{5})$/);

    if (match && Number(match[1]) === year) {
      max = Math.max(max, Number(match[2]));
    }
  }

  return `MOVID${year}-${String(max + 1).padStart(5, "0")}`;
}

/* =====================================================
   NEXT RECEIVE REF NO
   Format: RCINYYYYMM-00001
   ===================================================== */
async function getNextRefNoValue() {
  const rows = await readRows(SHEET);

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `RCIN${year}${month}-`;

  let max = 0;

  for (const row of rows || []) {
    const ref = clean(row.REF_NO ?? row.refNo);

    if (!ref.startsWith(prefix)) continue;

    const numberPart = Number(ref.substring(prefix.length));

    if (Number.isFinite(numberPart)) {
      max = Math.max(max, numberPart);
    }
  }

  return `${prefix}${String(max + 1).padStart(5, "0")}`;
}

/* =====================================================
   INSERT RECEIVE STOCK
   ===================================================== */
async function insertReceiveStock(data = {}) {
  const movementId = await getNextMovementId();
  const refNo = clean(data.refNo) || await getNextRefNoValue();
  const now = new Date().toISOString();

  const qrCode =
    `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(movementId)}`;

  const payload = {
    MOVEMENT_ID: movementId,
    TYPE: "IN",
    REF_NO: refNo,
    DATE: clean(data.dateIn) || new Date().toISOString().slice(0, 10),
    CODE: clean(data.code),
    NAME: clean(data.name),
    QTY: Number(data.qty),
    UNIT: clean(data.unit),
    LOT: clean(data.lot),
    EXP: clean(data.exp),
    TARGET: clean(data.supplier),
    USER: clean(data.user),
    TIME: now,
    REMARK: clean(data.remark),
    LOCATION: clean(data.location),
    QRCODE: qrCode
  };

  console.log("=== INSERT RECEIVE STOCK ===");
  console.log("PAYLOAD =", payload);

  await appendRow(SHEET, payload);

  console.log("✅ INVENTORY_MOVEMENT SAVED:", movementId, refNo);

  return {
    ok: true,
    movementId,
    refNo,
    qrCode,
    data: payload
  };
}

module.exports = {
  getInventoryMaster,
  getAllReceiveStock,
  getNextMovementId,
  getNextRefNoValue,
  insertReceiveStock
};
