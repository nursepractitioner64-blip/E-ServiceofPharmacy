const router = require("express").Router();
const controller = require("./sumdrugstock.controller");

router.get("/summary", controller.getSummary);

module.exports = router;
