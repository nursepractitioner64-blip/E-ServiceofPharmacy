const express = require("express");

const router = express.Router();

/* =====================================================
 * VACCINE MASTER
 * ===================================================== */

const vaccineMasterRoutes =
  require("../modules/vaccinemaster/vaccinemaster.routes");


/* =====================================================
 * INVENTORY MASTER
 * ===================================================== */

router.use(
  "/inventory-master",
  require("../modules/inventorymaster/inventorymaster.routes")
);


/* =====================================================
 * RECEIVE STOCK
 * ===================================================== */

router.use(
  "/receive-stock",
  require("../modules/receivestock/receivestock.routes")
);


/* Legacy */
router.use(
  "/receivestock",
  require("../modules/receivestock/receivestock.routes")
);


/* =====================================================
 * DISPENSE
 * ===================================================== */

router.use(
  "/dispense",
  require("../modules/dispense/dispense.routes")
);


/* =====================================================
 * RECEIVE DRUG
 * ===================================================== */

router.use(
  "/receivedrug",
  require("../modules/receivedrug/receivedrug.routes")
);


/* =====================================================
 * DAILY CHECK
 * ===================================================== */

router.use(
  "/dailycheck",
  require("../modules/dailycheck/dailycheck.routes")
);


/* =====================================================
 * DASHBOARD - SUMMARY DRUG
 * ===================================================== */

router.use(
  "/dashboard",
  require("../modules/dashboard/summarydrug/sumdrugstock.routes")
);


/* =====================================================
 * EMERGENCY CHECK
 * ===================================================== */

router.use(
  "/emergencycheck",
  require("../modules/emergencycheck/emergencycheck.routes")
);


/* =====================================================
 * CONTROLLED DRUG
 * ===================================================== */

router.use(
  "/controlleddrug",
  require("../modules/controlleddrug/controlleddrug.routes")
);


/* =====================================================
 * INVENTORY MOVEMENT
 * ===================================================== */

router.get(
  "/inventory-movement",
  async (req, res) => {

    try {

      const {
        getSheets
      } = require("../config/google");

      const sheets =
        await getSheets();

      const result =
        await sheets.spreadsheets.values.get({

          spreadsheetId:
            process.env.GOOGLE_SHEET_ID,

          range:
            "INVENTORY_MOVEMENT!A:R"

        });

      const values =
        result.data.values || [];

      const rows =
        values
          .slice(1)
          .map(row => ({

            MOVEMENT_ID:
              row[0] || "",

            TYPE:
              row[1] || "",

            REF_NO:
              row[2] || "",

            DATE:
              row[3] || "",

            CODE:
              row[4] || "",

            NAME:
              row[5] || "",

            QTY:
              Number(row[6] || 0),

            UNIT:
              row[7] || "",

            LOT:
              row[8] || "",

            EXP:
              row[9] || "",

            TARGET:
              row[10] || "",

            USER:
              row[11] || "",

            TIME:
              row[12] || "",

            BRANCH_ID:
              row[13] || "",

            LOCATION:
              row[14] || "",

            QRCODE:
              row[15] || "",

            CONTAINER_ID:
              row[16] || "",

            CONTAINER_QR:
              row[17] || ""

          }));

      return res.json(rows);

    } catch (err) {

      console.error(
        "INVENTORY MOVEMENT ERROR:",
        err
      );

      return res.status(500).json({
        ok: false,
        message:
          err.message ||
          "ไม่สามารถโหลด INVENTORY_MOVEMENT ได้"
      });

    }

  }
);

/* =====================================================
 * DRUG MASTER
 * ===================================================== */

router.get(
  "/drug-master",
  async (req, res) => {

    try {

      const repository =
        require(
          "../modules/dispense/dispense.repository"
        );

      const rows =
        await repository.getDrugReceive();


      return res.json({

        ok: true,

        data: rows

      });


    } catch (err) {

      console.error(
        "DRUG MASTER ERROR:",
        err
      );

      return res.status(500).json({

        ok: false,

        message:
          err.message

      });

    }

  }
);


/* =====================================================
 * STICKER PRINT
 * ===================================================== */

router.use(
  "/sticker-print",
  require(
    "../modules/sticker-print/sticker.routes"
  )
);


/* =====================================================
 * DRUG BALANCE
 * ===================================================== */

router.use(
  "/",
  require(
    "../modules/drugbalance/drugbalance.routes"
  )
);


/* =====================================================
 * VACCINE MASTER
 *
 * IMPORTANT:
 * ต้องอยู่ก่อน export
 * ===================================================== */

router.use(
  "/vaccine-master",
  vaccineMasterRoutes
);


/* =====================================================
 * UNIFIED DASHBOARD
 * ===================================================== */

router.use(
  "/dashboard",
  require(
    "../modules/dashboard/unified-dashboard.routes"
  )
);


/* =====================================================
 * EXPORT
 * ===================================================== */

module.exports = router;