const express = require("express");
const router = express.Router();

/* =====================================================
 * CENTRAL API ROUTER
 *
 * server.js mounts this router once at /api.
 * Module routes stay inside their own modules.
 * ===================================================== */

router.use(
  "/inventory-master",
  require("../modules/inventorymaster/inventorymaster.routes")
);

router.use(
  "/receive-stock",
  require("../modules/receivestock/receivestock.routes")
);

// Legacy/short path kept for existing clients.
router.use(
  "/receivestock",
  require("../modules/receivestock/receivestock.routes")
);

router.use(
  "/dispense",
  require("../modules/dispense/dispense.routes")
);

router.use(
  "/receivedrug",
  require("../modules/receivedrug/receivedrug.routes")
);

router.use(
  "/dailycheck",
  require("../modules/dailycheck/dailycheck.routes")
);

router.use(
  "/dashboard",
  require("../modules/dashboard/summarydrug/sumdrugstock.routes")
);

router.use(
  "/emergencycheck",
  require("../modules/emergencycheck/emergencycheck.routes")
);

router.use(
  "/controlleddrug",
  require("../modules/controlleddrug/controlleddrug.routes")
);


// Inventory movement is shared by Emergency Inventory Dispense and sticker/reporting clients.
router.get("/inventory-movement", async (req, res) => {
  try {
    const { getSheets } = require("../config/google");
    const sheets = await getSheets();
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "INVENTORY_MOVEMENT!A:O"
    });
    const values = result.data.values || [];
    const rows = values.slice(1).map(row => ({
      MOVEMENT_ID: row[0] || "", TYPE: row[1] || "", REF_NO: row[2] || "",
      DATE: row[3] || "", CODE: row[4] || "", NAME: row[5] || "",
      QTY: Number(row[6] || 0), UNIT: row[7] || "", LOT: row[8] || "",
      EXP: row[9] || "", TARGET: row[10] || "", USER: row[11] || "",
      TIME: row[12] || "", REMARK: row[13] || "", Location: row[14] || ""
    }));
    return res.json(rows);
  } catch (err) {
    console.error("INVENTORY MOVEMENT ERROR:", err);
    return res.status(500).json({ ok: false, message: err.message });
  }
});

router.get("/drug-master", async (req, res) => {
  try {
    const repository = require("../modules/dispense/dispense.repository");
    const rows = await repository.getDrugReceive();
    return res.json({ ok: true, data: rows });
  } catch (err) {
    console.error("DRUG MASTER ERROR:", err);
    return res.status(500).json({ ok: false, message: err.message });
  }
});

router.use(
  "/sticker-print",
  require("../modules/sticker-print/sticker.routes")
);

// Preserve existing public endpoints:
// /api/stock/balance and /api/master
router.use(
  "/",
  require("../modules/drugbalance/drugbalance.routes")
);

module.exports = router;

router.use("/dashboard", require("../modules/dashboard/unified-dashboard.routes"));
