const service = require("./receivestock.service");
const branchService = require("../branches/branches.service");

/**
 * Resolve the branch currently selected in the authenticated session.
 * The client never decides which branch/location is written to movement rows.
 */
async function getCurrentBranch(req) {
  const branchId = String(req.authBranchId || "").trim();
  if (!branchId || branchId === "ALL") {
    throw new Error("กรุณาเลือกสาขาที่ปฏิบัติงานก่อนรับสินค้าเข้า");
  }

  const branches = await branchService.listBranches({ includeInactive: false });
  const branch = (branches || []).find(
    item => String(item.BRANCH_ID || "").trim() === branchId
  );

  if (!branch) {
    throw new Error("ไม่พบสาขาที่ปฏิบัติงาน หรือสาขาปิดใช้งานแล้ว");
  }

  return {
    branchId,
    location: String(branch.BRANCH_NAME || "").trim()
  };
}

/* GET current authenticated branch context for the receive-stock modal. */
exports.getContext = async (req, res) => {
  try {
    const branch = await getCurrentBranch(req);
    return res.json({
      ok: true,
      data: {
        branchId: branch.branchId,
        location: branch.location,
        user: String(req.authUser?.fullName || req.authUser?.username || "").trim()
      }
    });
  } catch (err) {
    return res.status(400).json({
      ok: false,
      message: err.message || "โหลดสาขาที่ปฏิบัติงานไม่สำเร็จ"
    });
  }
};

/* GET receive movements for the current branch only. */
exports.getAll = async (req, res) => {
  try {
    const branch = await getCurrentBranch(req);
    const data = await service.getAll(branch.branchId);
    return res.json({ ok: true, data });
  } catch (err) {
    console.error("GET RECEIVE STOCK ERROR:", err);
    return res.status(400).json({
      ok: false,
      message: err.message || "โหลดข้อมูลไม่สำเร็จ"
    });
  }
};

/* POST receive stock. Branch and location are resolved server-side. */
exports.create = async (req, res) => {
  try {
    const branch = await getCurrentBranch(req);
    const result = await service.create(req.body || {}, {
      ...branch,
      user: String(req.authUser?.fullName || req.authUser?.username || "").trim()
    });

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

exports.getNextRefNo = async (req, res) => {
  try {
    const refNo = await service.getNextRefNo();
    return res.json({ ok: true, refNo });
  } catch (err) {
    console.error("GET REFNO ERROR:", err);
    return res.status(500).json({
      ok: false,
      message: err.message || "สร้างเลขที่รับไม่สำเร็จ"
    });
  }
};

exports.getInventoryMaster = async (req, res) => {
  try {
    const data = await service.getInventoryMaster();
    return res.json({ ok: true, data });
  } catch (err) {
    console.error("GET INVENTORY MASTER ERROR:", err);
    return res.status(500).json({
      ok: false,
      message: err.message || "โหลด Master ไม่สำเร็จ"
    });
  }
};
