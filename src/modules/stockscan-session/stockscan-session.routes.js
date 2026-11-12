'use strict';

const express = require('express');
const router = express.Router();
const { requireAuth, requireBranch } = require('../auth/auth.middleware');
const service = require('./stockscan-session.service');

// All StockScan SESSION endpoints inherit the Hub login and selected-branch context.
router.use(requireAuth, requireBranch);

router.get('/new', async (req, res) => {
  try {
    const data = await service.createSession({
      branchId: req.authBranchId,
      user: req.authUser
    });
    res.json({ success: true, data, session_id: data.session_id, branch_id: data.branch_id, user: data.user });
  } catch (error) {
    console.error('STOCKSCAN SESSION CREATE ERROR:', error);
    res.status(500).json({ success: false, message: error.message || 'สร้าง SESSION ไม่สำเร็จ' });
  }
});

router.get('/movement/:token', async (req, res) => {
  try {
    const data = await service.getMovementForBranch(req.params.token, req.authBranchId);
    res.json({ success: true, ok: true, data });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, ok: false, message: error.message || 'ค้นหารายการไม่สำเร็จ', error: error.message });
  }
});

router.post('/:sessionId/count', async (req, res) => {
  try {
    const data = await service.saveCountItems({
      sessionId: req.params.sessionId,
      branchId: req.authBranchId,
      user: req.authUser,
      items: req.body?.items
    });
    res.json({ success: true, ...data });
  } catch (error) {
    console.error('STOCKSCAN SESSION COUNT ERROR:', error);
    res.status(error.status || 400).json({ success: false, message: error.message || 'บันทึกผลตรวจนับไม่สำเร็จ', saved: error.saved, expected: error.expected });
  }
});

router.get('/:sessionId/items', async (req, res) => {
  try {
    const data = await service.getSessionItems({
      sessionId: req.params.sessionId,
      branchId: req.authBranchId
    });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'โหลดรายการ SESSION ไม่สำเร็จ' });
  }
});

router.post('/:sessionId/close', async (req, res) => {
  try {
    const data = await service.closeSession({
      sessionId: req.params.sessionId,
      branchId: req.authBranchId
    });
    res.json({ success: true, ...data });
  } catch (error) {
    console.error('STOCKSCAN SESSION CLOSE ERROR:', error);
    res.status(error.status || 400).json({ success: false, message: error.message || 'สรุปผล SESSION ไม่สำเร็จ', saved: error.saved, expected: error.expected });
  }
});

module.exports = router;
