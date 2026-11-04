const service = require("./dispense.service");
const running = require("./dispense.running");
const branchService = require("../branches/branches.service");

async function getCurrentBranch(req) {
  const branchId = String(req.authBranchId || "").trim();
  if (!branchId || branchId === "ALL") throw new Error("กรุณาเลือกสาขาที่ปฏิบัติงานก่อนจำหน่ายยา");
  const branches = await branchService.listBranches({ includeInactive: false });
  const branch = (branches || []).find(item => String(item.BRANCH_ID || "").trim() === branchId);
  if (!branch) throw new Error("ไม่พบสาขาที่ปฏิบัติงาน หรือสาขาปิดใช้งานแล้ว");
  return { branchId, location: String(branch.BRANCH_NAME || "").trim(), user: String(req.authUser?.fullName || req.authUser?.username || "").trim() };
}

// =====================
// UPLOAD
// =====================
exports.uploadDispenseZip = async (req, res) => {

try{

console.log("========== UPLOAD ==========");

console.log(
"FILE:",
req.file?.originalname
);

console.log(
"SIZE:",
req.file?.size
);

if(!req.file){

return res
.status(400)
.json({
ok:false,
message:"No file"
});

}

const result =
await service
.uploadDrugOpd(
req.file.buffer
);

console.log(
"UPLOAD RESULT:",
result
);

return res.json({
ok:true,
...result
});

}
catch(err){

console.error(
"UPLOAD ERROR"
);

console.error(
err.stack
);

return res
.status(500)
.json({
ok:false,
message:
err.message
});

}

};

// =====================
// NEXT REF
// =====================
exports.getNextRefNo =
async (
  req,
  res
) => {

try {

const refNo =
await running.getRefNo();

return res.json({

ok:true,

refNo

});

}

catch(err){

console.error(
"NEXT REF ERROR:",
err
);

return res
.status(500)
.json({

ok:false,

message:
err.message

});

}

};

// =====================
// 🔥 FIX LIST API (สำคัญสุด)
// =====================
exports.getList = async (req, res) => {
  try {

    console.log("🔥 HIT /api/dispense");

    const branch = await getCurrentBranch(req);
    const data = (await service.getList()).filter(row => String(row.BRANCH_ID || row.branchId || "").trim() === branch.branchId);

    res.json({
      ok: true,
      data
    });

  } catch (err) {
    console.error("❌ GET LIST ERROR:", err);

    res.status(500).json({
      ok: false,
      message: err.message
    });
  }
};


exports.getByRefNo = async (req, res) => {

  try {

    const branch = await getCurrentBranch(req);
    const data = await service.getByRefNo(req.params.refNo, branch);

    if (!data) {

      return res.json({
        ok: false
      });

    }

    res.json({
      ok: true,
      data
    });

  } catch (err) {

    res.status(500).json({

      ok: false,

      message: err.message

    });

  }

};

exports.getStockMovement = async (req, res) => {

  try {

    const branch = await getCurrentBranch(req);
    const data = (await service.getList()).filter(row => String(row.BRANCH_ID || row.branchId || "").trim() === branch.branchId);

    res.json({
      ok: true,
      data
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      ok: false,
      message: err.message
    });

  }

};

exports.createDispense = async (req, res) => {

  try {

    const branch = await getCurrentBranch(req);
    const data = await service.createDispense(req.body || {}, branch);

    return res.json({
      ok: true,
      data
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      ok: false,
      message: err.message
    });

  }

};

exports.updateDispense = async (req, res) => {

  try {

    const branch = await getCurrentBranch(req);
    const data = await service.updateDispense(req.params.refNo, req.body || {}, branch);

    return res.json({
      ok: true,
      data
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      ok: false,
      message: err.message
    });

  }

};

exports.deleteDispense = async (req, res) => {

  try {

    const branch = await getCurrentBranch(req);
    await service.deleteDispense(req.params.refNo, branch);

    return res.json({
      ok: true
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      ok: false,
      message: err.message
    });

  }

};