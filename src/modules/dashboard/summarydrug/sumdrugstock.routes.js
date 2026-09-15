const router = require("express").Router();
const controller = require("./sumdrugstock.controller");

router.get("/summary", controller.getSummary);
router.get("/system", controller.getSystemDashboard);

module.exports = router;
