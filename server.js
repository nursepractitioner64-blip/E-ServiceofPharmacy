require("dotenv").config();
require("module-alias/register");

const express = require("express");
const path = require("path");

const app = express();

/* =====================================================
 * SECURITY / CORE MIDDLEWARE
===================================================== */

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true
  })
);


/* =====================================================
 * API ROUTER
 * All module API routes are registered in one place.
===================================================== */
<<<<<<< HEAD

const apiRoutes =
  require("./src/routes/index");

=======

const inventoryMasterRoutes =
  require(
    "./src/modules/inventorymaster/inventorymaster.routes"
  );


const receiveStockRoutes =
  require(
    "./src/modules/receivestock/receivestock.routes"
  );


const dispenseRoutes =
  require(
    "./src/modules/dispense/dispense.routes"
  );


const drugbalanceRoutes =
require(
  "./src/modules/drugbalance/drugbalance.routes.js"
);
>>>>>>> 4f05e1a (Fix)


const repository =
<<<<<<< HEAD
  require("./src/modules/dispense/dispense.repository");


/* =====================================================
 * API ROUTES
 * ALL API FIRST — centralized in src/routes/index.js
===================================================== */

/* =====================================================
 * STICKER PRINT
===================================================== */

=======
  require(
    "./src/modules/dispense/dispense.repository"
  );


/* =====================================================
 * API ROUTES
 * ALL API FIRST
===================================================== */


/* =====================================================
 * INVENTORY MASTER
 *
 * GET    /api/inventory-master
 * GET    /api/inventory-master/:code
 * POST   /api/inventory-master
 * PUT    /api/inventory-master/:code
 * DELETE /api/inventory-master/:code
===================================================== */

app.use(
  "/api/inventory-master",
  inventoryMasterRoutes
);


/* =====================================================
 * INVENTORY MOVEMENT
 *
 * SOURCE:
 * Sheet: INVENTORY_MOVEMENT
 *
 * ใช้สำหรับ Inventory Dispense
 *
 * Frontend:
 * /api/inventory-movement
 *
 * Client จะกรอง:
 * TYPE = IN
 *
 * และนำข้อมูล:
 * CODE
 * NAME
 * UNIT
 * LOT
 * EXP
===================================================== */

app.get(
  "/api/inventory-movement",
  async (req, res) => {

    try {

      console.log(
        "📦 LOAD INVENTORY_MOVEMENT"
      );


      const {
        GoogleSpreadsheet
      } = require(
        "google-spreadsheet"
      );


      const {
        JWT
      } = require(
        "google-auth-library"
      );


      /* =================================================
       * GOOGLE AUTH
      ================================================= */

      const auth =
        new JWT({

          email:
            process.env
              .GOOGLE_SERVICE_ACCOUNT_EMAIL,

          key:
            process.env
              .GOOGLE_PRIVATE_KEY
              ?.replace(
                /\\n/g,
                "\n"
              ),

          scopes: [
            "https://www.googleapis.com/auth/spreadsheets"
          ]

        });


      /* =================================================
       * GOOGLE SHEET
      ================================================= */

      const doc =
        new GoogleSpreadsheet(
          process.env.GOOGLE_SHEET_ID,
          auth
        );


      await doc.loadInfo();


      /* =================================================
       * GET SHEET
      ================================================= */

      const sheet =
        doc.sheetsByTitle[
          "INVENTORY_MOVEMENT"
        ];


      if (!sheet) {

        throw new Error(
          "Sheet INVENTORY_MOVEMENT not found"
        );

      }


      /* =================================================
       * GET ROWS
      ================================================= */

      const rows =
        await sheet.getRows();


      console.log(
        "📦 INVENTORY_MOVEMENT ROWS =",
        rows.length
      );


      /* =================================================
       * MAP DATA
      ================================================= */

      const result =
        rows.map(
          row => ({

            MOVEMENT_ID:
              row.get(
                "MOVEMENT_ID"
              ) || "",


            TYPE:
              row.get(
                "TYPE"
              ) || "",


            REF_NO:
              row.get(
                "REF_NO"
              ) || "",


            DATE:
              row.get(
                "DATE"
              ) || "",


            CODE:
              row.get(
                "CODE"
              ) || "",


            NAME:
              row.get(
                "NAME"
              ) || "",


            QTY:
              Number(
                row.get(
                  "QTY"
                ) || 0
              ),


            UNIT:
              row.get(
                "UNIT"
              ) || "",


            LOT:
              row.get(
                "LOT"
              ) || "",


            EXP:
              row.get(
                "EXP"
              ) || "",


            TARGET:
              row.get(
                "TARGET"
              ) || "",


            USER:
              row.get(
                "USER"
              ) || "",


            TIME:
              row.get(
                "TIME"
              ) || "",


            REMARK:
              row.get(
                "REMARK"
              ) || "",


            Location:
              row.get(
                "Location"
              ) || ""

          })
        );


      /* =================================================
       * RESPONSE
      ================================================= */

      res.json(
        result
      );


    } catch (err) {

      console.error(
        "❌ INVENTORY MOVEMENT ERROR:",
        err
      );


      res
        .status(500)
        .json({

          ok: false,

          message:
            err.message

        });

    }

  }
);


/* =====================================================
 * RECEIVE STOCK
===================================================== */

app.use(
  "/api/receive-stock",
  receiveStockRoutes
);


/* =====================================================
 * DISPENSE
 *
 * GET  /api/dispense
 * POST /api/dispense
 * DELETE /api/dispense/:id
 * GET /api/dispense/refno
===================================================== */

app.use(
  "/api/dispense",
  dispenseRoutes
);


/* =====================================================
 * RECEIVESTOCK
 *
 * หมายเหตุ:
 * มี route เดิมอยู่แล้ว
 * คงไว้ตามระบบปัจจุบัน
===================================================== */

app.use(
  "/api/receivestock",
  require(
    "./src/modules/receivestock/receivestock.routes"
  )
);


/* =====================================================
 * RECEIVEDRUG
===================================================== */

app.use(
  "/api/receivedrug",
  require(
    "./src/modules/receivedrug/receivedrug.routes"
  )
);


/* =====================================================
 * DAILY CHECK
===================================================== */

app.use(
  "/api/dailycheck",
  require(
    "./src/modules/dailycheck/dailycheck.routes"
  )
);


/* =====================================================
 * DASHBOARD
===================================================== */

app.use(
  "/api/dashboard",
  require(
    "./src/modules/dashboard/summarydrug/sumdrugstock.routes"
  )
);


/* =====================================================
 * STOCK BALANCE API
===================================================== */

app.use(
  "/api",
  drugbalanceRoutes
);


/* =====================================================
 * STICKER PRINT
===================================================== */

>>>>>>> 4f05e1a (Fix)
app.use(
  "/modules/sticker-print",
  express.static(
    path.join(
      __dirname,
      "src/modules/sticker-print"
    )
  )
);


<<<<<<< HEAD
/* =====================================================
 * CENTRAL MODULE API ROUTES
 * ===================================================== */

app.use(
  "/api",
  apiRoutes
);


/* =====================================================
 * API 404 HANDLER
 *
 * ต้องอยู่หลัง API routes ทั้งหมด
===================================================== */

=======
app.use(
  "/api/sticker-print",
  require(
    "./src/modules/sticker-print/sticker.routes"
  )
);


/* =====================================================
 * DRUG MASTER
===================================================== */

app.get(
  "/api/drug-master",
  async (
    req,
    res
  ) => {

    try {

      const rows =
        await repository.getDrugReceive();


      return res.json({

        ok: true,

        data: rows

      });


    } catch (err) {

      console.error(
        err
      );


      return res
        .status(500)
        .json({

          ok: false,

          message:
            err.message

        });

    }

  }
);


/* =====================================================
 * API 404 HANDLER
 *
 * ต้องอยู่หลัง API routes ทั้งหมด
===================================================== */

>>>>>>> 4f05e1a (Fix)
app.use(
  "/api",
  (
    req,
    res
  ) => {

    res
      .status(404)
      .json({

        ok: false,

        message:
          `API not found: ${req.originalUrl}`

      });

  }
);


/* =====================================================
 * STATIC FILES
===================================================== */

app.use(
  express.static(
    path.join(
      __dirname,
      "public"
    )
  )
);


/* =====================================================
 * SPA FALLBACK
 *
 * NON-API ONLY
===================================================== */

app.get(
  "*",
  (
    req,
    res
  ) => {

    res.sendFile(
      path.join(
        __dirname,
        "public",
        "index.html"
      )
    );

  }
);


/* =====================================================
 * GLOBAL ERROR HANDLER
===================================================== */

app.use(
  (
    err,
    req,
    res,
    next
  ) => {

    console.error(
      "🔥 SERVER ERROR:",
      err
    );


    res
      .status(500)
      .json({

        ok: false,

        message:
          "Internal Server Error"

      });

  }
);


/* =====================================================
 * START SERVER
===================================================== */

const PORT =
  process.env.PORT ||
  2003;


app.listen(
  PORT,
  () => {

    console.log(
      `🚀 Server running: http://localhost:${PORT}`
    );

  }
);