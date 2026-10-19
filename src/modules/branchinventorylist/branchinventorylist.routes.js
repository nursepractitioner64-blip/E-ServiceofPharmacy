'use strict';
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/auth.middleware');
const auth = require('../auth/auth.service');
const { getBranchInventoryList, saveBranchInventoryList } = require('./branchinventorylist.service');
const branchService = require('../branches/branches.service');

router.use(requireAuth);

function isAdmin(user) {
  return String(user?.role || '').trim().toUpperCase() === 'ADMIN';
}

// Staff can manage Inventory List only for branches assigned to their account.
// Admin can manage any active branch. This is checked on every read/write request.
function canManageBranch(user, branchId) {
  const id = String(branchId || '').trim();
  if (!id || id === 'ALL') return false;
  if (isAdmin(user)) return true;
  return Array.isArray(user?.branchIds) && user.branchIds.some(x => String(x).trim().toUpperCase() === id.toUpperCase());
}

// Refresh branch assignments from USERS on every request. Session permissions may be stale
// if an Admin assigned a branch from another server process or while the Staff was logged in.
async function getEffectiveUser(req) {
  const sessionUser = req.authUser || {};
  try {
    const users = await auth.listUsers();
    const fresh = users.find(user => String(user.userId) === String(sessionUser.userId));
    if (fresh) {
      if (String(fresh.status || '').toUpperCase() !== 'ACTIVE') throw new Error('บัญชีนี้ถูกระงับการใช้งาน');
      return { ...sessionUser, ...fresh, role: isAdmin(fresh) ? 'ADMIN' : 'STAFF' };
    }
  } catch (error) {
    if (error.message === 'บัญชีนี้ถูกระงับการใช้งาน') throw error;
    console.error('BRANCH INVENTORY PERMISSION REFRESH ERROR:', error.message);
    throw new Error('ตรวจสอบสิทธิ์สาขาจาก USERS ไม่สำเร็จ กรุณาลองใหม่');
  }
  throw new Error('ไม่พบบัญชีผู้ใช้ในชีต USERS กรุณาเข้าสู่ระบบใหม่');
}

router.get('/branches', async (req, res) => {
  try {
    const effectiveUser = await getEffectiveUser(req);
    const all = await branchService.listBranches({ includeInactive: false });
    const allowed = isAdmin(effectiveUser) ? all : all.filter(b => canManageBranch(effectiveUser, b.BRANCH_ID));
    const session = auth.getSession(req);
    const currentBranchId = allowed.some(b => b.BRANCH_ID === session?.currentBranchId) ? session.currentBranchId : '';
    res.json({
      ok: true,
      role: isAdmin(effectiveUser) ? 'ADMIN' : 'STAFF',
      currentBranchId,
      data: allowed.map(b => ({ branchId: b.BRANCH_ID, name: b.BRANCH_NAME }))
    });
  } catch (error) {
    console.error('BRANCH INVENTORY BRANCHES ERROR:', error);
    res.status(500).json({ ok: false, message: 'โหลดรายชื่อสาขาที่มีสิทธิ์ไม่สำเร็จ' });
  }
});

router.get('/', async (req, res) => {
  try {
    const effectiveUser = await getEffectiveUser(req);
    const branchId = String(req.query.branchId || '').trim();
    if (!branchId) return res.status(400).json({ ok: false, message: 'กรุณาเลือกสาขา' });
    if (!canManageBranch(effectiveUser, branchId)) {
      return res.status(403).json({ ok: false, message: 'คุณไม่มีสิทธิ์จัดการ Inventory List ของสาขานี้ กรุณาติดต่อ Admin เพื่อกำหนดสาขาให้บัญชีของคุณ' });
    }
    const branches = await branchService.listBranches({ includeInactive: false });
    const branch = branches.find(b => b.BRANCH_ID === branchId);
    if (!branch) return res.status(404).json({ ok: false, message: 'ไม่พบสาขาหรือสาขาปิดใช้งานแล้ว' });
    const data = await getBranchInventoryList(branchId);
    const missing = data.filter(item => item.missingFromMaster).map(item => item.code);
    res.json({ ok: true, branch: { branchId: branch.BRANCH_ID, name: branch.BRANCH_NAME }, data, missingMandatory: missing });
  } catch (error) {
    console.error('BRANCH INVENTORY LIST LOAD ERROR:', error);
    res.status(500).json({ ok: false, message: error.message || 'โหลด Inventory List ไม่สำเร็จ' });
  }
});

router.put('/', async (req, res) => {
  try {
    const effectiveUser = await getEffectiveUser(req);
    const branchId = String(req.body?.branchId || '').trim();
    if (!canManageBranch(effectiveUser, branchId)) {
      return res.status(403).json({ ok: false, message: 'คุณไม่มีสิทธิ์บันทึก Inventory List ของสาขานี้ กรุณาติดต่อ Admin เพื่อกำหนดสาขาให้บัญชีของคุณ' });
    }
    const result = await saveBranchInventoryList(branchId, req.body?.items, effectiveUser);
    res.json({ ok: true, message: 'บันทึก Inventory List ของสาขาสำเร็จ', data: result });
  } catch (error) {
    console.error('BRANCH INVENTORY LIST SAVE ERROR:', error);
    res.status(400).json({ ok: false, message: error.message || 'บันทึก Inventory List ไม่สำเร็จ' });
  }
});

module.exports = router;
module.exports.canManageBranch = canManageBranch;
