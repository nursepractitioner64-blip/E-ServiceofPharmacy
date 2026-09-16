const { getSheets, readRows, appendRow, getSpreadsheetId } = require("../../config/google");

const SHEET = "INVENTORY_MOVEMENT";
const MASTER_SHEET = "INVENTORY_MASTER";

function clean(v) {
  return v === undefined || v === null ? "" : String(v).trim();
}

function normalize(row) {
  return {
    MOVEMENT_ID: clean(row.MOVEMENT_ID || row.movement_id),
    TYPE: clean(row.TYPE || row.type),
    REF_NO: clean(row.REF_NO || row.refNo || row.receivestockNo),
    DATE: clean(row.DATE || row.date || row.dateIn),
    CODE: clean(row.CODE || row.code),
    NAME: clean(row.NAME || row.name),
    QTY: Number(row.QTY ?? row.qty ?? 0),
    UNIT: clean(row.UNIT || row.unit),
    LOT: clean(row.LOT || row.lot),
    EXP: clean(row.EXP || row.exp),
    TARGET: clean(row.TARGET || row.target || row.supplier),
    USER: clean(row.USER || row.user),
    TIME: clean(row.TIME || row.time),
    REMARK: clean(row.REMARK || row.remark),
    LOCATION: clean(row.LOCATION || row.location),
    QRCODE: clean(row.QRCODE || row.qrcode)
  };
}

exports.getInventoryMaster = async (req, res) => {
  try {
    const rows = await readRows(MASTER_SHEET);
    const data = rows.map(r => ({
      code: clean(r.CODE || r.Code || r.code),
      name: clean(r.NAME || r.Name || r.name),
      unit: clean(r.UNIT || r.Unit || r.unit)
    })).filter(r => r.code);
    return res.json(data);
  } catch (err) {
    console.error("GET INVENTORY MASTER ERROR:", err);
    return res.status(500).json({ ok: false, message: err.message });
  }
};

exports.getAllReceiveStock = async (req, res) => {
  try {
    const rows = await readRows(SHEET);
    const data = rows
      .map(normalize)
      .filter(r => r.TYPE.toUpperCase() === "IN")
      .map(r => ({
        MOVEMENT_ID: r.MOVEMENT_ID,
        REF_NO: r.REF_NO,
        DATE: r.DATE,
        CODE: r.CODE,
        NAME: r.NAME,
        QTY: r.QTY,
        UNIT: r.UNIT,
        LOT: r.LOT,
        EXP: r.EXP,
        TARGET: r.TARGET,
        USER: r.USER,
        TIME: r.TIME,
        QRCODE: r.QRCODE
      }));
    return res.json(data);
  } catch (err) {
    console.error("GET RECEIVE STOCK ERROR:", err);
    return res.status(500).json({ ok: false, message: err.message });
  }
};

async function getNextMovementId() {
  const rows = await readRows(SHEET);
  let max = 0;
  const year = new Date().getFullYear();

  for (const r of rows || []) {
    const id = clean(r.MOVEMENT_ID || r.movement_id);
    const m = id.match(/^MOVID(\d{4})-(\d{5})$/);
    if (m && Number(m[1]) === year) max = Math.max(max, Number(m[2]));
  }

  return `MOVID${year}-${String(max + 1).padStart(5, "0")}`;
}

exports.createReceiveStock = async (req, res) => {
  try {
    console.log("=== CREATE RECEIVE START ===");
    console.log("BODY =", req.body);

    const data = req.body || {};
    const type = "IN";
    const dateIn = clean(data.dateIn) || new Date().toISOString().slice(0, 10);
    const code = clean(data.code);
    const name = clean(data.name);
    const qty = Number(data.qty);
    const unit = clean(data.unit);
    const lot = clean(data.lot);
    const exp = clean(data.exp);
    const supplier = clean(data.supplier);
    const user = clean(data.user);

    if (!code || !name || !Number.isFinite(qty) || qty <= 0 || !lot || !exp || !supplier || !user) {
      return res.status(400).json({
        ok: false,
        message: "ข้อมูลรับสินค้าไม่ครบ: กรุณาตรวจสอบ รหัสยา ชื่อยา จำนวน LOT EXP Supplier และ User"
      });
    }

    const movementId = await getNextMovementId();
    const refNo = clean(data.receivestockNo) || await exports.getNextRefNoValue();
    const now = new Date().toISOString();
    const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(movementId)}`;

    const payload = {
      MOVEMENT_ID: movementId,
      TYPE: type,
      REF_NO: refNo,
      DATE: dateIn,
      CODE: code,
      NAME: name,
      QTY: qty,
      UNIT: unit,
      LOT: lot,
      EXP: exp,
      TARGET: supplier,
      USER: user,
      TIME: now,
      REMARK: "",
      LOCATION: "",
      QRCODE: qrCode
    };

    console.log("SAVE PAYLOAD =", payload);
    await appendRow(SHEET, payload);
    console.log("✅ INVENTORY_MOVEMENT SAVED:", movementId);

    return res.json({ ok: true, movementId, refNo, qrCode });
  } catch (err) {
    console.error("CREATE RECEIVE ERROR:", err);
    return res.status(500).json({ ok: false, message: err.message || "บันทึกไม่สำเร็จ" });
  }
};

exports.getNextRefNoValue = async () => {
  const rows = await readRows(SHEET);
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `RCIN${year}${month}-`;
  let max = 0;

  for (const r of rows || []) {
    const ref = clean(r.REF_NO || r.refNo);
    if (!ref.startsWith(prefix)) continue;
    const n = Number(ref.split("-")[1]);
    if (Number.isFinite(n)) max = Math.max(max, n);
  }

  return `${prefix}${String(max + 1).padStart(5, "0")}`;
};

exports.getNextRefNo = async (req, res) => {
  try {
    return res.json({ refNo: await exports.getNextRefNoValue() });
  } catch (err) {
    console.error("GET REFNO ERROR:", err);
    return res.status(500).json({ ok: false, message: err.message });
  }
};
