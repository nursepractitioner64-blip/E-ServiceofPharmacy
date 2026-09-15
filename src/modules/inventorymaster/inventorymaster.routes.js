const express = require("express");
const router = express.Router();

const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");

/* =====================================================
   GOOGLE AUTH
===================================================== */

const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,

  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),

  scopes: [
    "https://www.googleapis.com/auth/spreadsheets"
  ]
});

/* =====================================================
   GOOGLE SHEET
===================================================== */

const doc = new GoogleSpreadsheet(
  process.env.GOOGLE_SHEET_ID,
  serviceAccountAuth
);

/* =====================================================
   GET SHEET
===================================================== */

async function getInventorySheet() {

  await doc.loadInfo();

  const sheet = doc.sheetsByTitle["INVENTORY_MASTER"];

  if (!sheet) {
    throw new Error("Sheet INVENTORY_MASTER not found");
  }

  return sheet;
}

/* =====================================================
   GET INVENTORY MASTER
   GET /api/inventory-master
===================================================== */

router.get("/", async (req, res) => {

  try {

    console.log("📦 LOAD INVENTORY MASTER");

    const sheet = await getInventorySheet();

    const rows = await sheet.getRows();

    console.log("ROWS =", rows.length);

    const result = rows.map(row => ({
      CODE: row.get("CODE") || "",
      NAME: row.get("NAME") || "",
      UNIT: row.get("UNIT") || "",
      REQUIRED: Number(row.get("REQUIRED") || 0)
    }));

    res.json(result);

  } catch (err) {

    console.error(
      "❌ INVENTORY MASTER ERROR:",
      err
    );

    res.status(500).json({
      ok: false,
      message: err.message
    });
  }
});

/* =====================================================
   GET SINGLE INVENTORY
   GET /api/inventory-master/:code
===================================================== */

router.get("/:code", async (req, res) => {

  try {

    const code = String(req.params.code || "").trim();

    console.log(
      "🔎 LOAD INVENTORY:",
      code
    );

    if (!code) {

      return res.status(400).json({
        ok: false,
        message: "CODE is required"
      });
    }

    const sheet = await getInventorySheet();

    const rows = await sheet.getRows();

    const row = rows.find(r => {

      const rowCode = String(
        r.get("CODE") || ""
      ).trim();

      return rowCode === code;
    });

    if (!row) {

      return res.status(404).json({
        ok: false,
        message: `ไม่พบรหัส ${code}`
      });
    }

    const result = {
      CODE: row.get("CODE") || "",
      NAME: row.get("NAME") || "",
      UNIT: row.get("UNIT") || "",
      REQUIRED: Number(
        row.get("REQUIRED") || 0
      )
    };

    console.log(
      "✅ INVENTORY FOUND:",
      result
    );

    res.json({
      ok: true,
      data: result
    });

  } catch (err) {

    console.error(
      "❌ GET INVENTORY ERROR:",
      err
    );

    res.status(500).json({
      ok: false,
      message: err.message
    });
  }
});

/* =====================================================
   CREATE INVENTORY
   POST /api/inventory-master
===================================================== */

router.post("/", async (req, res) => {

  try {

    const {
      CODE,
      NAME,
      UNIT,
      REQUIRED
    } = req.body || {};

    const code = String(CODE || "").trim();
    const name = String(NAME || "").trim();
    const unit = String(UNIT || "").trim();
    const required = Number(REQUIRED || 0);

    if (!code) {

      return res.status(400).json({
        ok: false,
        message: "กรุณาระบุ CODE"
      });
    }

    if (!name) {

      return res.status(400).json({
        ok: false,
        message: "กรุณาระบุ NAME"
      });
    }

    const sheet = await getInventorySheet();

    const rows = await sheet.getRows();

    const exists = rows.some(row =>
      String(row.get("CODE") || "")
        .trim()
        .toUpperCase() === code.toUpperCase()
    );

    if (exists) {

      return res.status(409).json({
        ok: false,
        message: `มี CODE ${code} อยู่แล้ว`
      });
    }

    await sheet.addRow({
      CODE: code,
      NAME: name,
      UNIT: unit,
      REQUIRED: required
    });

    console.log(
      "✅ INVENTORY CREATED:",
      code
    );

    res.status(201).json({
      ok: true,
      message: "เพิ่มข้อมูลสำเร็จ",
      data: {
        CODE: code,
        NAME: name,
        UNIT: unit,
        REQUIRED: required
      }
    });

  } catch (err) {

    console.error(
      "❌ CREATE INVENTORY ERROR:",
      err
    );

    res.status(500).json({
      ok: false,
      message: err.message
    });
  }
});

/* =====================================================
   UPDATE INVENTORY
   PUT /api/inventory-master/:code
===================================================== */

router.put("/:code", async (req, res) => {

  try {

    const code = String(
      req.params.code || ""
    ).trim();

    const {
      NAME,
      UNIT,
      REQUIRED
    } = req.body || {};

    if (!code) {

      return res.status(400).json({
        ok: false,
        message: "CODE is required"
      });
    }

    const sheet = await getInventorySheet();

    const rows = await sheet.getRows();

    const row = rows.find(r =>
      String(r.get("CODE") || "")
        .trim() === code
    );

    if (!row) {

      return res.status(404).json({
        ok: false,
        message: `ไม่พบรหัส ${code}`
      });
    }

    if (NAME !== undefined) {
      row.set(
        "NAME",
        String(NAME).trim()
      );
    }

    if (UNIT !== undefined) {
      row.set(
        "UNIT",
        String(UNIT).trim()
      );
    }

    if (REQUIRED !== undefined) {
      row.set(
        "REQUIRED",
        Number(REQUIRED || 0)
      );
    }

    await row.save();

    console.log(
      "✅ INVENTORY UPDATED:",
      code
    );

    res.json({
      ok: true,
      message: "แก้ไขข้อมูลสำเร็จ",
      data: {
        CODE: row.get("CODE") || "",
        NAME: row.get("NAME") || "",
        UNIT: row.get("UNIT") || "",
        REQUIRED: Number(
          row.get("REQUIRED") || 0
        )
      }
    });

  } catch (err) {

    console.error(
      "❌ UPDATE INVENTORY ERROR:",
      err
    );

    res.status(500).json({
      ok: false,
      message: err.message
    });
  }
});

/* =====================================================
   DELETE INVENTORY
   DELETE /api/inventory-master/:code
===================================================== */

router.delete("/:code", async (req, res) => {

  try {

    const code = String(
      req.params.code || ""
    ).trim();

    if (!code) {

      return res.status(400).json({
        ok: false,
        message: "CODE is required"
      });
    }

    const sheet = await getInventorySheet();

    const rows = await sheet.getRows();

    const row = rows.find(r =>
      String(r.get("CODE") || "")
        .trim() === code
    );

    if (!row) {

      return res.status(404).json({
        ok: false,
        message: `ไม่พบรหัส ${code}`
      });
    }

    await row.delete();

    console.log(
      "🗑️ INVENTORY DELETED:",
      code
    );

    res.json({
      ok: true,
      message: "ลบข้อมูลสำเร็จ",
      CODE: code
    });

  } catch (err) {

    console.error(
      "❌ DELETE INVENTORY ERROR:",
      err
    );

    res.status(500).json({
      ok: false,
      message: err.message
    });
  }
});

/* =====================================================
   EXPORT
===================================================== */

module.exports = router;