const router = require("express").Router();
const controller = require("./dispense.controller");
const multer = require("multer");

const { requireAuth, requireBranch } = require("../auth/auth.middleware");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.get("/", requireAuth, requireBranch, controller.getList);

router.get("/stock-movement", requireAuth, requireBranch, controller.getStockMovement);

router.get("/next-refno", controller.getNextRefNo);

router.get("/:refNo", requireAuth, requireBranch, controller.getByRefNo);

router.post(
  "/upload",
  upload.single("file"),
  controller.uploadDispenseZip
);

router.post("/", requireAuth, requireBranch, controller.createDispense);

router.put(
  "/:refNo",
  requireAuth,
  requireBranch,
  controller.updateDispense
);

router.delete(
  "/:refNo",
  requireAuth,
  requireBranch,
  controller.deleteDispense
);

module.exports = router;