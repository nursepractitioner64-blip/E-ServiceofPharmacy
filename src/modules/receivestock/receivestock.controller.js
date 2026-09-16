const service = require("./receivestock.service");

/* =====================================================
   GET ALL RECEIVE STOCK
   GET /api/receivestock
   ===================================================== */
exports.getAll = async (req, res) => {
  try {
    const data = await service.getAll();

    return res.json({
      ok: true,
      data
    });
  } catch (err) {
    console.error("GET RECEIVE STOCK ERROR:", err);

    return res.status(500).json({
      ok: false,
      message: err.message || "โหลดข้อมูลไม่สำเร็จ"
    });
  }
};

/* =====================================================
   CREATE RECEIVE STOCK
   POST /api/receivestock
   ===================================================== */
exports.create = async (req, res) => {
  try {
    console.log("=== POST /api/receivestock ===");
    console.log("BODY =", req.body);

    const result = await service.create(req.body || {});

    return res.status(200).json({
      ok: true,
      message: "บันทึกรับสินค้าสำเร็จ",
      ...result
    });
  } catch (err) {
    console.error("CREATE RECEIVE STOCK ERROR:", err);

    return res.status(400).json({
      ok: false,
      message: err.message || "บันทึกไม่สำเร็จ"
    });
  }
};

/* =====================================================
   NEXT REF NO
   GET /api/receivestock/refno
   ===================================================== */
exports.getNextRefNo = async (req, res) => {
  try {
    const refNo = await service.getNextRefNo();

    return res.json({
      ok: true,
      refNo
    });
  } catch (err) {
    console.error("GET REFNO ERROR:", err);

    return res.status(500).json({
      ok: false,
      message: err.message || "สร้างเลขที่รับไม่สำเร็จ"
    });
  }
};

/* =====================================================
   INVENTORY MASTER
   GET /api/receivestock/master
   ===================================================== */
exports.getInventoryMaster = async (req, res) => {
  try {
    const data = await service.getInventoryMaster();

    return res.json({
      ok: true,
      data
    });
  } catch (err) {
    console.error("GET INVENTORY MASTER ERROR:", err);

    return res.status(500).json({
      ok: false,
      message: err.message || "โหลด Master ไม่สำเร็จ"
    });
  }
};
