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

const apiRoutes =
  require("./src/routes/index");


const repository =
  require("./src/modules/dispense/dispense.repository");


/* =====================================================
 * API ROUTES
 * ALL API FIRST — centralized in src/routes/index.js
===================================================== */

/* =====================================================
 * STICKER PRINT
===================================================== */

app.use(
  "/modules/sticker-print",
  express.static(
    path.join(
      __dirname,
      "src/modules/sticker-print"
    )
  )
);


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