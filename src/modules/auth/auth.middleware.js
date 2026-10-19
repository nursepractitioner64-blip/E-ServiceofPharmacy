const { getSession } = require('./auth.service');

function requireAuth(req, res, next) {
  const session = getSession(req);
  if (!session) {
    return res.status(401).json({ ok: false, success: false, code: 'AUTH_REQUIRED', message: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' });
  }
  req.authUser = session.user;
  req.authSessionId = session.sid;
  next();
}

async function requireBranch(req, res, next) {
  const branchId = String(req.authSessionId ? (getSession(req)?.currentBranchId || '') : '').trim();
  if (!branchId || branchId === 'ALL') {
    return res.status(400).json({ ok: false, success: false, code: 'BRANCH_REQUIRED', message: 'กรุณาเลือกสาขาที่ปฏิบัติงานก่อนบันทึกข้อมูล' });
  }
  const user = req.authUser;
  if (user?.role !== 'ADMIN' && !(Array.isArray(user?.branchIds) && user.branchIds.includes(branchId))) {
    return res.status(403).json({ ok: false, success: false, code: 'BRANCH_FORBIDDEN', message: 'คุณไม่มีสิทธิ์บันทึกข้อมูลในสาขานี้' });
  }
  try {
    const branchService = require('../branches/branches.service');
    const activeBranches = await branchService.listBranches({ includeInactive: false });
    if (!activeBranches.some(branch => branch.BRANCH_ID === branchId)) {
      return res.status(403).json({ ok: false, success: false, code: 'BRANCH_INACTIVE', message: 'สาขานี้ปิดใช้งานแล้ว กรุณาเลือกสาขาอื่น' });
    }
    req.authBranchId = branchId;
    return next();
  } catch (err) {
    console.error('BRANCH PERMISSION CHECK ERROR:', err.message);
    return res.status(503).json({ ok: false, success: false, code: 'BRANCH_CHECK_UNAVAILABLE', message: 'ตรวจสอบสิทธิ์สาขาไม่สำเร็จ กรุณาลองใหม่' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.authUser || req.authUser.role !== 'ADMIN') {
    return res.status(403).json({ ok: false, success: false, message: 'เฉพาะ Admin เท่านั้น' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin, requireBranch };
