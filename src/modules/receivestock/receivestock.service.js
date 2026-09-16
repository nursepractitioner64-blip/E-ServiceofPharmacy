const repository = require("./receivestock.repository");

/* =====================================================
   RECEIVE STOCK SERVICE
   ===================================================== */

async function getAll() {
  const rows = await repository.getAllReceiveStock();

  return (rows || [])
    .filter(r => String(r.type || "").toUpperCase() === "IN")
    .sort((a, b) => new Date(b.dateIn || 0) - new Date(a.dateIn || 0));
}

async function create(data = {}) {
  const code = String(data.code || "").trim();
  const name = String(data.name || "").trim();
  const qty = Number(data.qty);
  const lot = String(data.lot || "").trim();
  const exp = String(data.exp || "").trim();
  const supplier = String(data.supplier || "").trim();
  const user = String(data.user || "").trim();

  if (!code || !name || !Number.isFinite(qty) || qty <= 0 || !lot || !exp || !supplier || !user) {
    throw new Error(
      "ข้อมูลรับสินค้าไม่ครบ: กรุณาตรวจสอบ รหัสยา ชื่อยา จำนวน LOT EXP Supplier และ User"
    );
  }

  const payload = {
    type: "IN",
    dateIn: String(data.dateIn || new Date().toISOString().slice(0, 10)).trim(),
    code,
    name,
    qty,
    unit: String(data.unit || "").trim(),
    lot,
    exp,
    supplier,
    user,
    remark: String(data.remark || "").trim(),
    location: String(data.location || "").trim(),
    refNo: String(data.receivestockNo || "").trim()
  };

  if (!payload.refNo) {
    payload.refNo = await repository.getNextRefNoValue();
  }

  return repository.insertReceiveStock(payload);
}

async function getNextRefNo() {
  return repository.getNextRefNoValue();
}

async function getInventoryMaster() {
  return repository.getInventoryMaster();
}

module.exports = {
  getAll,
  create,
  getNextRefNo,
  getInventoryMaster
};
