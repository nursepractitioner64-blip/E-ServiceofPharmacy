const repository = require("./receivestock.repository");

/* =====================================================
   RECEIVE STOCK SERVICE
===================================================== */

async function getAll() {
  const rows = await repository.getAllReceiveStock();

  return (rows || [])
    .filter(
      r =>
        String(r.type || "").toUpperCase() === "IN"
    )
    .sort(
      (a, b) =>
        new Date(b.dateIn || 0) -
        new Date(a.dateIn || 0)
    );
}

/* =====================================================
   CREATE RECEIVE STOCK
===================================================== */

async function create(data = {}) {

  const branchId =
    String(data.branchId || "").trim();

  const code =
    String(data.code || "").trim();

  const name =
    String(data.name || "").trim();

  const qty =
    Number(data.qty);

  const lot =
    String(data.lot || "").trim();

  const exp =
    String(data.exp || "").trim();

  const supplier =
    String(data.supplier || "").trim();

  const user =
    String(data.user || "").trim();

  const location =
    String(data.location || "").trim();


  /* ===================================================
     VALIDATE
  =================================================== */

  if (!branchId) {
    throw new Error(
      "BRANCH_ID is required"
    );
  }

  if (
    !code ||
    !name ||
    !Number.isFinite(qty) ||
    qty <= 0 ||
    !lot ||
    !exp ||
    !supplier ||
    !user
  ) {

    throw new Error(
      "ข้อมูลรับสินค้าไม่ครบ: กรุณาตรวจสอบ รหัสยา ชื่อยา จำนวน LOT EXP Supplier และ User"
    );
  }


  /* ===================================================
     PAYLOAD
  =================================================== */

  const payload = {

    branchId,

    type:
      "IN",

    dateIn:
      String(
        data.dateIn ||
        new Date()
          .toISOString()
          .slice(0, 10)
      ).trim(),

    code,

    name,

    qty,

    unit:
      String(
        data.unit || ""
      ).trim(),

    lot,

    exp,

    supplier,

    user,

    location,

    refNo:
      String(
        data.receivestockNo || ""
      ).trim()
  };


  /* ===================================================
     REF NO
  =================================================== */

  if (!payload.refNo) {

    payload.refNo =
      await repository.getNextRefNoValue();
  }


  /* ===================================================
     INSERT
  =================================================== */

  console.log(
    "=== RECEIVE STOCK SERVICE PAYLOAD ==="
  );

  console.log(
    payload
  );

  return repository.insertReceiveStock(
    payload
  );
}


/* =====================================================
   NEXT REF NO
===================================================== */

async function getNextRefNo() {

  return repository.getNextRefNoValue();

}


/* =====================================================
   INVENTORY MASTER
===================================================== */

async function getInventoryMaster() {

  return repository.getInventoryMaster();

}


/* =====================================================
   EXPORT
===================================================== */

module.exports = {

  getAll,

  create,

  getNextRefNo,

  getInventoryMaster

};