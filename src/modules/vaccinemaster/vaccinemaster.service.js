/* =========================================================
 VACCINE MASTER SERVICE
 File: src/modules/vaccinemaster/vaccinemaster.service.js

 Service layer: validation and calls to repository.
 ========================================================= */

const repository = require("./vaccinemaster.repository");

function clean(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

async function getVaccineMaster() {
  return repository.getVaccineMaster();
}

async function findVaccineByCode(code) {
  return repository.findVaccineByCode(code);
}

async function createVaccineMaster(data = {}) {
  return repository.createVaccineMaster(data);
}

async function updateVaccineMaster(code, data = {}) {
  return repository.updateVaccineMaster(code, data);
}

async function deleteVaccineMaster(code) {
  return repository.deleteVaccineMaster(code);
}

async function getNextStockRefNo(type = "IN") {
  const normalizedType = clean(type || "IN").toUpperCase();
  if (!["IN", "OUT"].includes(normalizedType)) {
    throw new Error("TYPE ต้องเป็น IN หรือ OUT");
  }
  return repository.getNextStockRefNo(normalizedType);
}

async function getNextMovementId() {
  return repository.getNextMovementId();
}

async function getVaccineStock(code) {
  return repository.getVaccineStock(code);
}

async function createVaccineStock(data = {}) {
  const type = clean(data.type || "IN").toUpperCase();
  if (!["IN", "OUT"].includes(type)) {
    throw new Error("TYPE ต้องเป็น IN หรือ OUT");
  }

  const normalized = {
    ...data,
    type,
    code: clean(data.code),
    name: clean(data.name),
    unit: clean(data.unit),
    lot: clean(data.lot),
    exp: clean(data.exp),
    date: clean(data.date),
    user: clean(data.user),
    location: clean(data.location),
    target: clean(data.target),
    remark: clean(data.remark),
    qty: Number(data.qty)
  };

  if (!normalized.code) throw new Error("กรุณาระบุ CODE");
  if (!normalized.name) throw new Error("กรุณาระบุ NAME");
  if (!Number.isFinite(normalized.qty) || normalized.qty <= 0) {
    throw new Error("QTY ไม่ถูกต้อง");
  }
  if (!normalized.unit) throw new Error("กรุณาระบุ UNIT");
  if (!normalized.lot) throw new Error("กรุณาระบุ LOT");
  if (!normalized.exp) throw new Error("กรุณาระบุ EXP");
  if (!normalized.date) throw new Error("กรุณาระบุ DATE");
  if (!normalized.user) throw new Error("กรุณาระบุ USER");

  return repository.createVaccineStock(normalized);
}


async function getVaccineDispenseHistory() {
  return repository.getVaccineDispenseHistory();
}



module.exports = {
  getVaccineMaster,
  findVaccineByCode,
  createVaccineMaster,
  updateVaccineMaster,
  deleteVaccineMaster,
  getNextStockRefNo,
  getNextMovementId,
  getVaccineStock,
  createVaccineStock,
  getVaccineDispenseHistory
};

