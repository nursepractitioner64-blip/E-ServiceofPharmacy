const express = require("express");
const router = express.Router();

const { getSheets } = require("../../config/google");

const SHEET_ID = process.env.GOOGLE_SHEET_ID;


/* =====================================================
   HELPER
===================================================== */

function generateSessionId() {

  const now = new Date();

  const pad = (n, len = 2) =>
    String(n).padStart(len, "0");

  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const mi = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  const ms = String(now.getMilliseconds()).padStart(3, "0");

  return `DCS-${yyyy}${mm}${dd}-${hh}${mi}${ss}-${ms}`;
}


function generateMovementId() {

  const now = new Date();

  const pad = (n, len = 2) =>
    String(n).padStart(len, "0");

  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const mi = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  const ms = String(now.getMilliseconds()).padStart(3, "0");

  return `DCM-${yyyy}${mm}${dd}-${hh}${mi}${ss}-${ms}`;
}


function isValidNumber(value) {

  return (
    value !== null &&
    value !== undefined &&
    value !== "" &&
    Number.isFinite(Number(value))
  );

}


/* =====================================================
   PARSE DATE
===================================================== */

function parseDate(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }


  // -----------------------------------------------
  // Date object
  // -----------------------------------------------

  if (value instanceof Date) {

    if (!isNaN(value.getTime())) {
      return value;
    }

    return null;
  }


  const text =
    String(value).trim();


  if (!text) {
    return null;
  }


  // -----------------------------------------------
  // ISO / Google date
  // -----------------------------------------------

  let date =
    new Date(text);


  if (
    !isNaN(date.getTime())
  ) {

    return date;

  }


  // -----------------------------------------------
  // DD/MM/YYYY HH:mm:ss
  // -----------------------------------------------

  const match =
    text.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
    );


  if (match) {

    let day =
      Number(match[1]);

    let month =
      Number(match[2]);

    let year =
      Number(match[3]);

    const hour =
      Number(match[4] || 0);

    const minute =
      Number(match[5] || 0);

    const second =
      Number(match[6] || 0);


    /*
     * รองรับ พ.ศ.
     */

    if (year > 2400) {
      year -= 543;
    }


    date =
      new Date(
        year,
        month - 1,
        day,
        hour,
        minute,
        second
      );


    if (!isNaN(date.getTime())) {
      return date;
    }

  }


  return null;

}


/* =====================================================
   GET DAILY CHECK
   GET /api/dailycheck?month=9&year=2026
===================================================== */

router.get("/", async (req, res) => {

  try {

    // =================================================
    // MONTH / YEAR
    // =================================================

    const now =
      new Date();


    const month =
      Number(
        req.query.month ||
        (now.getMonth() + 1)
      );


    const year =
      Number(
        req.query.year ||
        now.getFullYear()
      );


    if (
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {

      return res.status(400).json({

        ok: false,

        message:
          "เดือนไม่ถูกต้อง",

      });

    }


    if (
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100
    ) {

      return res.status(400).json({

        ok: false,

        message:
          "ปีไม่ถูกต้อง",

      });

    }


    // =================================================
    // GOOGLE SHEETS
    // =================================================

    const sheets =
      await getSheets();


    // =================================================
    // INVENTORY MASTER
    //
    // A CODE
    // B NAME
    // C UNIT
    // D REQUIRED
    // =================================================

    const masterResult =
      await sheets.spreadsheets.values.get({

        spreadsheetId:
          SHEET_ID,

        range:
          "INVENTORY_MASTER!A:D",

      });


    const masterValues =
      masterResult.data.values || [];


    if (
      masterValues.length <= 1
    ) {

      return res.json({

        ok: true,

        month,

        year,

        data: [],

        recorders: {},

      });

    }


    const masterRows =
      masterValues.slice(1);


    // =================================================
    // COUNT SESSION
    //
    // A SESSION_ID
    // B MOVEMENT_ID
    // C CODE
    // D NAME
    // E QTY
    // F USER
    // G TIME
    // =================================================

    const countResult =
      await sheets.spreadsheets.values.get({

        spreadsheetId:
          SHEET_ID,

        range:
          "COUNT_SESSION!A:G",

      });


    const countValues =
      countResult.data.values || [];


    const countRows =
      countValues.length > 1
        ? countValues.slice(1)
        : [];


    // =================================================
    // MAP
    // =================================================

    const stockMap = {};

    const recorderMap = {};

    const recorderTimeMap = {};


    // =================================================
    // READ COUNT SESSION
    // =================================================

    countRows.forEach((row) => {

      // -----------------------------------------------
      // C = CODE
      // -----------------------------------------------

      const code =
        String(
          row[2] || ""
        ).trim();


      if (!code) {
        return;
      }


      // -----------------------------------------------
      // E = QTY
      // -----------------------------------------------

      const qty =
        Number(
          row[4] || 0
        );


      // -----------------------------------------------
      // F = USER
      // สำคัญ: ใช้ F โดยตรง
      // -----------------------------------------------

      const user =
        String(
          row[5] || ""
        ).trim();


      // -----------------------------------------------
      // G = TIME
      // -----------------------------------------------

      const timeValue =
        row[6];


      const d =
        parseDate(
          timeValue
        );


      if (!d) {

        console.warn(
          "⚠️ DAILY CHECK INVALID TIME:",
          {
            code,
            user,
            time: timeValue,
          }
        );

        return;

      }


      const y =
        d.getFullYear();


      const m =
        d.getMonth() + 1;


      const day =
        d.getDate();


      // =================================================
      // FILTER
      // =================================================

      if (
        y !== year
      ) {
        return;
      }


      if (
        m !== month
      ) {
        return;
      }


      const currentTime =
        d.getTime();


      // =================================================
      // STOCK MAP
      //
      // รวม QTY ของ CODE เดียวกัน
      // ในวันเดียวกัน
      //
      // ตัวอย่าง:
      //
      // EMER037
      // 1 + 4 = 5
      //
      // EMER038
      // 3 + 1 + 3 = 7
      // =================================================

      const key =
        `${code}_${y}_${m}_${day}`;


      if (!stockMap[key]) {

        stockMap[key] = {

          qty: 0,

        };

      }


      stockMap[key].qty += qty;



      // =================================================
// RECORDER MAP
//
// F = USER
//
// ใช้ผู้ตรวจ + เวลา "ครั้งแรก" ของวัน
// =================================================

if (user) {

  const previousTime =
    recorderTimeMap[day] || 0;

  // ใช้รายการแรกของวัน
  if (
    !previousTime ||
    currentTime < previousTime
  ) {

    recorderMap[day] =
      user;

    recorderTimeMap[day] =
      currentTime;

  }

}

    });


    // =================================================
    // MERGE MASTER
    // =================================================

    const output = [];


    masterRows.forEach((row) => {

      const code =
        String(
          row[0] || ""
        ).trim();


      if (!code) {
        return;
      }


      const name =
        String(
          row[1] || ""
        );


      const unit =
        String(
          row[2] || ""
        );


      const required =
        Number(
          row[3] || 0
        );


      const obj = {

        CODE:
          code,

        NAME:
          name,

        UNIT:
          unit,

        REQUIRED:
          required,

      };


      // =================================================
      // DAYS 1 - 31
      // =================================================

      for (
        let day = 1;
        day <= 31;
        day++
      ) {

        const key =
          `${code}_${year}_${month}_${day}`;


        if (
          stockMap[key] &&
          stockMap[key].qty !== undefined
        ) {

          obj[day] =
            stockMap[key].qty;

        } else {

          obj[day] =
            "";

        }

      }


      output.push(
        obj
      );

    });


    // =================================================
    // DEBUG
    // =================================================

    console.log(
      "👤 DAILY CHECK RECORDERS:",
      recorderMap
    );


    console.log(
      "📊 DAILY CHECK DATA:",
      {
        month,
        year,
        rows:
          output.length,
        recorders:
          recorderMap,
      }
    );


    // =================================================
    // RESPONSE
    // =================================================

return res.json({

  ok: true,

  month: month,

  year: year,

  data: output,

  // ผู้ตรวจ/ผู้บันทึกคนแรกของวัน
  recorders: recorderMap,

  // เวลาแรกของวัน
  recorderTimes: recorderTimeMap,

});


  } catch (err) {

    console.error(
      "DAILY CHECK ERROR:",
      err
    );


    return res.status(500).json({

      ok:
        false,

      message:
        err.message ||
        "ไม่สามารถโหลด Daily Check ได้",

    });

  }

});


/* =====================================================
   POST DAILY CHECK
   POST /api/dailycheck/check

   BODY:

   {
     code: "EMER001",
     balance: 10,
     user: "สมชาย"
   }

===================================================== */

router.post(
  "/check",
  async (req, res) => {

    try {

      const {
        code,
        balance,
        user,
      } =
        req.body || {};


      // =================================================
      // CODE
      // =================================================

      const cleanCode =
        String(
          code || ""
        ).trim();


      if (!cleanCode) {

        return res.status(400).json({

          ok:
            false,

          message:
            "ไม่พบรหัสยา/เวชภัณฑ์",

        });

      }


      // =================================================
      // BALANCE
      // =================================================

      if (
        !isValidNumber(
          balance
        )
      ) {

        return res.status(400).json({

          ok:
            false,

          message:
            "จำนวนที่ตรวจนับต้องเป็นตัวเลข",

        });

      }


      const qty =
        Number(balance);


      if (
        qty < 0
      ) {

        return res.status(400).json({

          ok:
            false,

          message:
            "จำนวนต้องไม่ติดลบ",

        });

      }


      // =================================================
      // USER
      // =================================================

      const cleanUser =
        String(
          user ||
          req.user?.name ||
          req.user?.username ||
          "system"
        ).trim();


      // =================================================
      // GOOGLE SHEETS
      // =================================================

      const sheets =
        await getSheets();


      // =================================================
      // CHECK MASTER
      // =================================================

      const masterResult =
        await sheets.spreadsheets.values.get({

          spreadsheetId:
            SHEET_ID,

          range:
            "INVENTORY_MASTER!A:D",

        });


      const masterValues =
        masterResult.data.values || [];


      let item =
        null;


      for (
        let i = 1;
        i < masterValues.length;
        i++
      ) {

        const row =
          masterValues[i] || [];


        const rowCode =
          String(
            row[0] || ""
          ).trim();


        if (
          rowCode ===
          cleanCode
        ) {

          item = {

            CODE:
              rowCode,

            NAME:
              String(
                row[1] || ""
              ),

            UNIT:
              String(
                row[2] || ""
              ),

            REQUIRED:
              Number(
                row[3] || 0
              ),

          };


          break;

        }

      }


      if (!item) {

        return res.status(404).json({

          ok:
            false,

          message:
            `ไม่พบรหัส ${cleanCode} ใน INVENTORY_MASTER`,

        });

      }


      // =================================================
      // TIME
      // =================================================

      const now =
        new Date();


      const isoTime =
        now.toISOString();


      // =================================================
      // IDS
      // =================================================

      const sessionId =
        generateSessionId();


      const movementId =
        generateMovementId();


      // =================================================
      // COUNT_SESSION
      //
      // A SESSION_ID
      // B MOVEMENT_ID
      // C CODE
      // D NAME
      // E QTY
      // F USER
      // G TIME
      // =================================================

      const newRow = [

        sessionId,

        movementId,

        item.CODE,

        item.NAME,

        qty,

        cleanUser,

        isoTime,

      ];


      // =================================================
      // APPEND
      // =================================================

      await sheets.spreadsheets.values.append({

        spreadsheetId:
          SHEET_ID,

        range:
          "COUNT_SESSION!A:G",

        valueInputOption:
          "USER_ENTERED",

        insertDataOption:
          "INSERT_ROWS",

        requestBody: {

          values: [
            newRow
          ],

        },

      });


      // =================================================
      // LOG
      // =================================================

      console.log(
        "✅ DAILY CHECK SAVED:",
        {
          sessionId,
          movementId,
          code:
            item.CODE,
          qty,
          user:
            cleanUser,
          time:
            isoTime,
        }
      );


      // =================================================
      // RESPONSE
      // =================================================

      return res.json({

        ok:
          true,

        success:
          true,

        message:
          "บันทึกผลตรวจสำเร็จ",

        data: {

          SESSION_ID:
            sessionId,

          MOVEMENT_ID:
            movementId,

          CODE:
            item.CODE,

          NAME:
            item.NAME,

          QTY:
            qty,

          USER:
            cleanUser,

          TIME:
            isoTime,

        },

      });


    } catch (err) {

      console.error(
        "DAILY CHECK SAVE ERROR:",
        err
      );


      return res.status(500).json({

        ok:
          false,

        success:
          false,

        message:
          err.message ||
          "ไม่สามารถบันทึกผลตรวจได้",

      });

    }

  }
);


module.exports = router;