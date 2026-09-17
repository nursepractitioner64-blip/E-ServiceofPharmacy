const express = require("express");
const controller = require("./receivestock.controller");

const router = express.Router();

router.get("/", controller.getAll);
router.post("/", controller.create);
router.get("/refno", controller.getNextRefNo);
router.get("/master", controller.getInventoryMaster);

module.exports = router;
