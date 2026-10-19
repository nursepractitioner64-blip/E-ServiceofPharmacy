const express = require('express');
const router = express.Router();
const service = require('./branches.service');
const { requireAuth, requireAdmin } = require('../auth/auth.middleware');
const auth = require('../auth/auth.service');

async function effectiveUser(req) {
  const sessionUser = req.authUser || {};
  const users = await auth.listUsers();
  const fresh = users.find(user => String(user.userId) === String(sessionUser.userId));
  if (!fresh || String(fresh.status || '').toUpperCase() !== 'ACTIVE') throw new Error('ไม่พบบัญชีผู้ใช้ที่เปิดใช้งานในชีต USERS');
  return { ...sessionUser, ...fresh, role: String(fresh.role || '').toUpperCase() === 'ADMIN' ? 'ADMIN' : 'STAFF' };
}

// Return only branches this account is allowed to select. A remembered branch is
// a client preference only; every selection is validated against current permissions.
router.get('/selection', requireAuth, async (req, res) => {
  try {
    const user = await effectiveUser(req);
    const all = await service.listBranches({ includeInactive: false });
    const allowed = user.role === 'ADMIN'
      ? all
      : all.filter(b => (user.branchIds || []).some(id => String(id).trim().toUpperCase() === String(b.BRANCH_ID).trim().toUpperCase()));
    const session = auth.getSession(req);
    const remembered = session?.currentBranchId || '';
    const currentValid = allowed.some(b => b.BRANCH_ID === remembered);
    res.json({ ok: true, data: allowed.map(b => ({ branchId: b.BRANCH_ID, name: b.BRANCH_NAME })), currentBranchId: currentValid ? remembered : '', canViewAll: user.role === 'ADMIN' });
  } catch (err) { console.error('BRANCH SELECTION ERROR:', err.message); res.status(500).json({ ok: false, message: 'โหลดสาขาสำหรับปฏิบัติงานไม่สำเร็จ' }); }
});

router.post('/selection', requireAuth, async (req, res) => {
  try {
    const user = await effectiveUser(req);
    const branchId = String(req.body?.branchId || '').trim();
    if (branchId === 'ALL' && user.role === 'ADMIN') {
      auth.setSessionBranch(req, 'ALL');
      return res.json({ ok: true, currentBranchId: 'ALL', currentBranchName: 'ภาพรวมทุกสาขา' });
    }
    if (!branchId) return res.status(400).json({ ok: false, message: 'กรุณาเลือกสาขา' });
    const branches = await service.listBranches({ includeInactive: false });
    const branch = branches.find(b => b.BRANCH_ID === branchId);
    if (!branch) return res.status(404).json({ ok: false, message: 'ไม่พบสาขาหรือสาขาปิดใช้งานแล้ว' });
    if (user.role !== 'ADMIN' && !(user.branchIds || []).some(id => String(id).trim().toUpperCase() === branchId.toUpperCase())) {
      return res.status(403).json({ ok: false, message: 'คุณไม่มีสิทธิ์เลือกสาขานี้' });
    }
    auth.setSessionBranch(req, branchId);
    res.json({ ok: true, currentBranchId: branchId, currentBranchName: branch.BRANCH_NAME });
  } catch (err) { console.error('BRANCH SELECT ERROR:', err.message); res.status(500).json({ ok: false, message: 'เลือกสาขาไม่สำเร็จ' }); }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const data = await service.listBranches({ includeInactive: req.authUser.role === 'ADMIN' });
    res.json({ ok: true, data: data.map(b => ({ branchId: b.BRANCH_ID, branchCode: b.BRANCH_CODE || '', name: b.BRANCH_NAME, status: b.STATUS, createdAt: b.CREATED_AT, updatedAt: b.UPDATED_AT })) });
  } catch (err) { console.error('BRANCH LIST ERROR:', err.message); res.status(500).json({ ok: false, message: err.message || 'โหลดสาขาไม่สำเร็จ' }); }
});
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try { res.status(201).json({ ok: true, data: await service.createBranch(req.body || {}, req.authUser) }); }
  catch (err) { res.status(400).json({ ok: false, message: err.message || 'สร้างสาขาไม่สำเร็จ' }); }
});
router.patch('/:branchId', requireAuth, requireAdmin, async (req, res) => {
  try { const ok = await service.updateBranch(req.params.branchId, req.body || {}); if (!ok) return res.status(404).json({ ok: false, message: 'ไม่พบสาขา' }); res.json({ ok: true, message: 'บันทึกสาขาสำเร็จ' }); }
  catch (err) { res.status(400).json({ ok: false, message: err.message || 'บันทึกสาขาไม่สำเร็จ' }); }
});
module.exports = router;
