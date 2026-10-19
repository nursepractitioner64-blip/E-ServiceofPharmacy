const router = require("express").Router();
const controller = require("./sumdrugstock.controller");
const { requireAuth } = require("../../auth/auth.middleware");

router.get("/summary", controller.getSummary);
router.get("/system", requireAuth, controller.getSystemDashboard);

module.exports = router;
