const express = require("express");
const controller = require("./receivestock.controller");
const { requireAuth, requireBranch } = require("../auth/auth.middleware");

const router = express.Router();

/* Branch context and stock history are always scoped to the selected authorized branch. */
router.get("/context", requireAuth, requireBranch, controller.getContext);
router.get("/", requireAuth, requireBranch, controller.getAll);
router.post("/", requireAuth, requireBranch, controller.create);
router.get("/refno", requireAuth, controller.getNextRefNo);
router.get("/master", requireAuth, controller.getInventoryMaster);

module.exports = router;
