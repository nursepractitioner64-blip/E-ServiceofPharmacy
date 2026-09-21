/**
 * =========================================================
 * VACCINE MASTER ROUTES
 *
 * File:
 * src/modules/vaccinemaster/vaccinemaster.routes.js
 *
 * SOURCE:
 * VACCINE_MASTER
 * VACCINE_MOVEMENT
 *
 * IMPORTANT:
 * Vaccine Stock ห้ามใช้ INVENTORY_MOVEMENT
 * =========================================================
 */

const express = require("express");

const router = express.Router();

const {
  GoogleSpreadsheet
} = require("google-spreadsheet");

const {
  JWT
} = require("google-auth-library");


/* =====================================================
   GOOGLE AUTH
===================================================== */

const serviceAccountAuth =
  new JWT({

    email:
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,

    key:
      process.env.GOOGLE_PRIVATE_KEY
        ?.replace(
          /\\n/g,
          "\n"
        ),

    scopes: [
      "https://www.googleapis.com/auth/spreadsheets"
    ]

  });


/* =====================================================
   GOOGLE SHEET
===================================================== */

const doc =
  new GoogleSpreadsheet(
    process.env.GOOGLE_SHEET_ID,
    serviceAccountAuth
  );


/* =====================================================
   GET SHEET
===================================================== */

async function getSheet(
  sheetName
) {

  await doc.loadInfo();


  const sheet =
    doc.sheetsByTitle[
      sheetName
    ];


  if (!sheet) {

    throw new Error(
      `Sheet ${sheetName} not found`
    );

  }


  return sheet;

}


/* =====================================================
   VACCINE MASTER SHEET
===================================================== */

async function getVaccineMasterSheet() {

  return await getSheet(
    "VACCINE_MASTER"
  );

}


/* =====================================================
   VACCINE MOVEMENT SHEET
===================================================== */

async function getVaccineMovementSheet() {

  return await getSheet(
    "VACCINE_MOVEMENT"
  );

}


/* =====================================================
   NORMALIZE HEADER
===================================================== */

function normalizeHeader(
  value
) {

  return String(
    value || ""
  )
    .trim()
    .toUpperCase();

}


/* =====================================================
   GET ROW VALUE
 *
 * รองรับทั้ง Header ตัวใหญ่/เล็ก
===================================================== */

function getRowValue(
  row,
  field
) {

  const wanted =
    normalizeHeader(
      field
    );


  const possible =
    [
      field,
      field.toUpperCase(),
      field.toLowerCase()
    ];


  for (
    const key of possible
  ) {

    try {

      const value =
        row.get(key);


      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
      ) {

        return value;

      }

    } catch (error) {

      /*
       * google-spreadsheet
       * อาจ throw เมื่อไม่มี header
       */

    }

  }


  /*
   * Fallback:
   * ตรวจจาก row._rawData
   */

  try {

    const headers =
      row._sheet?.headerValues ||
      [];


    const index =
      headers.findIndex(
        header =>
          normalizeHeader(
            header
          ) === wanted
      );


    if (
      index >= 0 &&
      Array.isArray(
        row._rawData
      )
    ) {

      return (
        row._rawData[index] ??
        ""
      );

    }

  } catch (error) {

    /*
     * ignore
     */

  }


  return "";

}


/* =====================================================
   SET ROW VALUE
===================================================== */

function setRowValue(
  row,
  field,
  value
) {

  try {

    row.set(
      field,
      value
    );

    return true;

  } catch (error) {

    try {

      row.set(
        field.toUpperCase(),
        value
      );

      return true;

    } catch (error2) {

      return false;

    }

  }

}


/* =====================================================
   BUILD MOVEMENT ID
 *
 * Format:
 * VMINYYYYMM00001
 * ===================================================== */

function buildMovementId(
  sequence
) {

  const now =
    new Date();


  const year =
    now.getFullYear();


  const month =
    String(
      now.getMonth() + 1
    )
      .padStart(
        2,
        "0"
      );


  return (
    `VMI${year}${month}${String(sequence).padStart(5, "0")}`
  );

}


/* =====================================================
   BUILD REF NO
   Format: RCINYYYY-00001
   Reset: NEW YEAR ONLY
   ===================================================== */
function buildRefNo(year, sequence) {
  return `RCIN${year}-${String(sequence).padStart(5, "0")}`;
}

function getNextRcinSequence(rows, year) {
  const targetYear = String(year);
  let max = 0;
  for (const row of rows) {
    const refNo = String(getRowValue(row, "REF_NO") || "").trim().toUpperCase();
    const match = refNo.match(/^RCIN(\d{4})-(\d{5})$/);
    if (!match || match[1] !== targetYear) continue;
    const sequence = Number(match[2]);
    if (Number.isInteger(sequence) && sequence > max) max = sequence;
  }
  return max + 1;
}

/* Prevent duplicate RCIN inside this Node process. */
let vaccineStockWriteQueue = Promise.resolve();
function withVaccineStockLock(task) {
  const current = vaccineStockWriteQueue.then(task, task);
  vaccineStockWriteQueue = current.catch(() => {});
  return current;
}


/* =====================================================
   GET SINGLE VACCINE
 *
 * GET
 * /api/vaccine-master/:code
===================================================== */

router.get(
  "/:code",
  async (
    req,
    res
  ) => {

    try {

      const code =
        String(
          req.params.code ||
          ""
        ).trim();


      if (!code) {

        return res.status(
          400
        ).json({

          ok:
            false,

          message:
            "CODE is required"

        });

      }


      const sheet =
        await getVaccineMasterSheet();


      const rows =
        await sheet.getRows();


      const row =
        rows.find(
          r => {

            const rowCode =
              String(
                getRowValue(
                  r,
                  "CODE"
                ) || ""
              ).trim();


            return (
              rowCode.toUpperCase() ===
              code.toUpperCase()
            );

          }
        );


      if (!row) {

        return res.status(
          404
        ).json({

          ok:
            false,

          message:
            `ไม่พบวัคซีน ${code}`

        });

      }


      return res.json({

        ok:
          true,

        data: {

          code:
            getRowValue(
              row,
              "CODE"
            ) || "",

          name:
            getRowValue(
              row,
              "NAME"
            ) || "",

          THname:
            getRowValue(
              row,
              "THname"
            ) ||
            getRowValue(
              row,
              "THNAME"
            ) ||
            ""

        }

      });


    } catch (err) {

      console.error(
        "❌ GET VACCINE ERROR:",
        err
      );


      return res.status(
        500
      ).json({

        ok:
          false,

        message:
          err.message

      });

    }

  }
);


/* =====================================================
   CREATE VACCINE
 *
 * POST
 * /api/vaccine-master
===================================================== */

router.post(
  "/",
  async (
    req,
    res
  ) => {

    try {

      const {
        code,
        name,
        THname
      } =
        req.body || {};


      const vaccineCode =
        String(
          code || ""
        ).trim();


      const vaccineName =
        String(
          name || ""
        ).trim();


      const vaccineTHname =
        String(
          THname || ""
        ).trim();


      if (!vaccineCode) {

        return res.status(
          400
        ).json({

          ok:
            false,

          message:
            "กรุณาระบุ CODE"

        });

      }


      if (!vaccineName) {

        return res.status(
          400
        ).json({

          ok:
            false,

          message:
            "กรุณาระบุ NAME"

        });

      }


      if (!vaccineTHname) {

        return res.status(
          400
        ).json({

          ok:
            false,

          message:
            "กรุณาระบุ THname"

        });

      }


      const sheet =
        await getVaccineMasterSheet();


      const rows =
        await sheet.getRows();


      const exists =
        rows.some(
          row => {

            const rowCode =
              String(
                getRowValue(
                  row,
                  "CODE"
                ) || ""
              ).trim();


            return (
              rowCode.toUpperCase() ===
              vaccineCode.toUpperCase()
            );

          }
        );


      if (exists) {

        return res.status(
          409
        ).json({

          ok:
            false,

          message:
            `มี CODE ${vaccineCode} อยู่แล้ว`

        });

      }


      await sheet.addRow({

        code:
          vaccineCode,

        name:
          vaccineName,

        THname:
          vaccineTHname

      });


      console.log(
        "✅ VACCINE CREATED:",
        vaccineCode
      );


      return res.status(
        201
      ).json({

        ok:
          true,

        message:
          "เพิ่มข้อมูลวัคซีนสำเร็จ",

        data: {

          code:
            vaccineCode,

          name:
            vaccineName,

          THname:
            vaccineTHname

        }

      });


    } catch (err) {

      console.error(
        "❌ CREATE VACCINE ERROR:",
        err
      );


      return res.status(
        500
      ).json({

        ok:
          false,

        message:
          err.message

      });

    }

  }
);


/* =====================================================
   UPDATE VACCINE
 *
 * PUT
 * /api/vaccine-master/:code
===================================================== */

router.put(
  "/:code",
  async (
    req,
    res
  ) => {

    try {

      const oldCode =
        String(
          req.params.code ||
          ""
        ).trim();


      const {
        name,
        THname
      } =
        req.body || {};


      if (!oldCode) {

        return res.status(
          400
        ).json({

          ok:
            false,

          message:
            "CODE is required"

        });

      }


      const sheet =
        await getVaccineMasterSheet();


      const rows =
        await sheet.getRows();


      const row =
        rows.find(
          r => {

            const rowCode =
              String(
                getRowValue(
                  r,
                  "CODE"
                ) || ""
              ).trim();


            return (
              rowCode.toUpperCase() ===
              oldCode.toUpperCase()
            );

          }
        );


      if (!row) {

        return res.status(
          404
        ).json({

          ok:
            false,

          message:
            `ไม่พบวัคซีน ${oldCode}`

        });

      }


      if (
        name !== undefined
      ) {

        setRowValue(
          row,
          "name",
          String(
            name
          ).trim()
        );

      }


      if (
        THname !== undefined
      ) {

        setRowValue(
          row,
          "THname",
          String(
            THname
          ).trim()
        );

      }


      await row.save();


      return res.json({

        ok:
          true,

        message:
          "แก้ไขข้อมูลสำเร็จ",

        data: {

          code:
            getRowValue(
              row,
              "CODE"
            ) || "",

          name:
            getRowValue(
              row,
              "NAME"
            ) || "",

          THname:
            getRowValue(
              row,
              "THname"
            ) ||
            getRowValue(
              row,
              "THNAME"
            ) ||
            ""

        }

      });


    } catch (err) {

      console.error(
        "❌ UPDATE VACCINE ERROR:",
        err
      );


      return res.status(
        500
      ).json({

        ok:
          false,

        message:
          err.message

      });

    }

  }
);


/* =====================================================
   DELETE VACCINE
 *
 * DELETE
 * /api/vaccine-master/:code
===================================================== */

router.delete(
  "/:code",
  async (
    req,
    res
  ) => {

    try {

      const code =
        String(
          req.params.code ||
          ""
        ).trim();


      if (!code) {

        return res.status(
          400
        ).json({

          ok:
            false,

          message:
            "CODE is required"

        });

      }


      const sheet =
        await getVaccineMasterSheet();


      const rows =
        await sheet.getRows();


      const row =
        rows.find(
          r => {

            const rowCode =
              String(
                getRowValue(
                  r,
                  "CODE"
                ) || ""
              ).trim();


            return (
              rowCode.toUpperCase() ===
              code.toUpperCase()
            );

          }
        );


      if (!row) {

        return res.status(
          404
        ).json({

          ok:
            false,

          message:
            `ไม่พบวัคซีน ${code}`

        });

      }


      await row.delete();


      console.log(
        "🗑️ VACCINE DELETED:",
        code
      );


      return res.json({

        ok:
          true,

        message:
          "ลบข้อมูลสำเร็จ",

        code

      });


    } catch (err) {

      console.error(
        "❌ DELETE VACCINE ERROR:",
        err
      );


      return res.status(
        500
      ).json({

        ok:
          false,

        message:
          err.message

      });

    }

  }
);


/* =====================================================
   CREATE VACCINE STOCK
 *
 * POST
 * /api/vaccine-master/stock
 *
 * SOURCE:
 * VACCINE_MOVEMENT
 *
 * TYPE:
 * IN
 *
 * Columns:
 * MOVEMENT_ID
 * TYPE
 * REF_NO
 * DATE
 * CODE
 * NAME
 * QTY
 * UNIT
 * LOT
 * EXP
 * TARGET
 * USER
 * TIME
 * REMARK
 * Location
 * QRCODE
===================================================== */

/* =====================================================
   GET NEXT RCIN PREVIEW
   GET /api/vaccine-master/stock/next-ref-no

   Preview only. It does not reserve the number.
   Final RCIN is generated again during POST /stock.
   ===================================================== */
router.get(
  "/stock/next-ref-no",
  async (req, res) => {
    try {
      const movementSheet =
        await getVaccineMovementSheet();

      const rows =
        await movementSheet.getRows();

      const year =
        new Date().getFullYear();

      const nextSequence =
        getNextRcinSequence(rows, year);

      const refNo =
        buildRefNo(year, nextSequence);

      console.log(
        "💉 NEXT VACCINE RCIN:",
        refNo
      );

      return res.json({
        ok: true,
        data: {
          REF_NO: refNo,
          YEAR: year,
          SEQUENCE: nextSequence
        }
      });

    } catch (err) {
      console.error(
        "❌ GET NEXT VACCINE RCIN ERROR:",
        err
      );

      return res.status(500).json({
        ok: false,
        message: err.message
      });
    }
  }
);


router.post(
  "/stock",
  async (req, res) => {
    try {
      const result = await withVaccineStockLock(async () => {
        console.log("💉 CREATE VACCINE STOCK");
        const { type, date, code, name, qty, unit, lot, exp, target, user, location, remark, qrcode } = req.body || {};
        const movementType = String(type || "IN").trim().toUpperCase();
        const vaccineCode = String(code || "").trim();
        const vaccineName = String(name || "").trim();
        const quantity = Number(qty || 0);
        const vaccineUnit = String(unit || "").trim();
        const vaccineLot = String(lot || "").trim();
        const vaccineExp = String(exp || "").trim();
        const movementDate = String(date || "").trim();
        const movementUser = String(user || "").trim();
        const movementLocation = String(location || "").trim();
        const movementRemark = String(remark || "").trim();

        if (movementType !== "IN") return { error: "Vaccine Stock รับเข้าได้เฉพาะ TYPE = IN", status: 400 };
        if (!vaccineCode) return { error: "กรุณาระบุ CODE", status: 400 };
        if (!vaccineName) return { error: "กรุณาระบุ NAME", status: 400 };
        if (!Number.isFinite(quantity) || quantity <= 0) return { error: "QTY ไม่ถูกต้อง", status: 400 };
        if (!vaccineUnit) return { error: "กรุณาระบุ UNIT", status: 400 };
        if (!vaccineLot) return { error: "กรุณาระบุ LOT", status: 400 };
        if (!vaccineExp) return { error: "กรุณาระบุ EXP", status: 400 };
        if (!movementUser) return { error: "กรุณาระบุ USER", status: 400 };
        if (!movementDate) return { error: "กรุณาระบุ DATE", status: 400 };

        const masterSheet = await getVaccineMasterSheet();
        const masterRows = await masterSheet.getRows();
        const masterRow = masterRows.find(row => String(getRowValue(row, "CODE") || "").trim().toUpperCase() === vaccineCode.toUpperCase());
        if (!masterRow) return { error: `ไม่พบ CODE ${vaccineCode} ใน VACCINE_MASTER`, status: 404 };

        const finalName = String(getRowValue(masterRow, "NAME") || vaccineName).trim();
        const movementSheet = await getVaccineMovementSheet();
        const rows = await movementSheet.getRows();
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");

        /* RCIN comes from the real VACCINE_MOVEMENT sheet. */
        const finalRefNo = buildRefNo(year, getNextRcinSequence(rows, year));

        /* Existing MOVEMENT_ID logic is preserved. */
        const movementPrefix = `VMI${year}${month}`;
        let maxMovement = 0;
        for (const row of rows) {
          const movementId = String(getRowValue(row, "MOVEMENT_ID") || "").trim();
          if (!movementId.startsWith(movementPrefix)) continue;
          const match = movementId.match(/(\d+)$/);
          if (!match) continue;
          const number = Number(match[1]);
          if (Number.isFinite(number) && number > maxMovement) maxMovement = number;
        }

        const movementId = buildMovementId(maxMovement + 1);
        const time = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        const finalQRCode = String(qrcode || `${vaccineCode}|${vaccineLot}|${vaccineExp}`).trim();
        const finalTarget = String(target || "VACCINE").trim();

        await movementSheet.addRow({
          MOVEMENT_ID: movementId,
          TYPE: "IN",
          REF_NO: finalRefNo,
          DATE: movementDate,
          CODE: vaccineCode,
          NAME: finalName,
          QTY: quantity,
          UNIT: vaccineUnit,
          LOT: vaccineLot,
          EXP: vaccineExp,
          TARGET: finalTarget,
          USER: movementUser,
          TIME: time,
          REMARK: movementRemark,
          Location: movementLocation,
          QRCODE: finalQRCode
        });

        console.log("✅ VACCINE STOCK CREATED:", { REF_NO: finalRefNo, MOVEMENT_ID: movementId, CODE: vaccineCode, LOT: vaccineLot, QTY: quantity });
        return { MOVEMENT_ID: movementId, REF_NO: finalRefNo, TYPE: "IN", DATE: movementDate, CODE: vaccineCode, NAME: finalName, QTY: quantity, UNIT: vaccineUnit, LOT: vaccineLot, EXP: vaccineExp, TARGET: finalTarget, USER: movementUser, TIME: time, REMARK: movementRemark, Location: movementLocation, QRCODE: finalQRCode };
      });

      if (result?.error) return res.status(result.status || 400).json({ ok: false, message: result.error });
      return res.status(201).json({ ok: true, message: "บันทึก Vaccine Stock สำเร็จ", data: result });
    } catch (err) {
      console.error("❌ CREATE VACCINE STOCK ERROR:", err);
      return res.status(err.status || 500).json({ ok: false, message: err.message });
    }
  }
);


/* =====================================================
 * VACCINE STOCK DETAIL
 *
 * GET
 * /api/vaccine-master/:code/stock
 *
 * SOURCE:
 * VACCINE_MOVEMENT
 *
 * Columns:
 * MOVEMENT_ID
 * TYPE
 * REF_NO
 * DATE
 * CODE
 * NAME
 * QTY
 * UNIT
 * LOT
 * EXP
 * TARGET
 * USER
 * TIME
 * REMARK
 * Location
 * QRCODE
 *
 * LOGIC:
 * IN  = เพิ่ม Stock
 * OUT = ลด Stock
 *
 * STOCK KEY:
 * LOT + EXP
 * ===================================================== */

router.get(
  "/:code/stock",
  async (
    req,
    res
  ) => {

    try {

      /* =================================================
       * CODE
       * ================================================= */

      const code =
        String(
          req.params.code ||
          ""
        ).trim();


      console.log(
        "🔎 LOAD VACCINE STOCK:",
        code
      );


      if (!code) {

        return res.status(
          400
        ).json({

          ok: false,

          message:
            "CODE is required"

        });

      }


      /* =================================================
       * GET VACCINE MOVEMENT SHEET
       *
       * ต้องเป็น VACCINE_MOVEMENT
       * ไม่ใช่ INVENTORY_MOVEMENT
       * ================================================= */

      const sheet =
        await getVaccineMovementSheet();


      const rows =
        await sheet.getRows();


      console.log(
        "📦 VACCINE MOVEMENT ROWS =",
        rows.length
      );


      /* =================================================
       * STOCK MAP
       *
       * แยก Stock ตาม
       *
       * LOT
       * EXP
       *
       * ตัวอย่าง:
       *
       * LOT001__2027-10-31
       * ================================================= */

      const stockMap =
        new Map();


      /* =================================================
       * LOOP MOVEMENT
       * ================================================= */

      for (
        const row of rows
      ) {

        /* ---------------------------------------------
         * CODE
         * --------------------------------------------- */

        const rowCode =
          String(
            getRowValue(
              row,
              "CODE"
            ) || ""
          ).trim();


        /*
         * ไม่ใช่ CODE ที่กำลังดู
         */

        if (
          rowCode.toUpperCase() !==
          code.toUpperCase()
        ) {

          continue;

        }


        /* ---------------------------------------------
         * LOT
         * --------------------------------------------- */

        const lot =
          String(
            getRowValue(
              row,
              "LOT"
            ) || ""
          ).trim();


        /* ---------------------------------------------
         * EXP
         * --------------------------------------------- */

        const exp =
          String(
            getRowValue(
              row,
              "EXP"
            ) || ""
          ).trim();


        /* ---------------------------------------------
         * TYPE
         * --------------------------------------------- */

        const type =
          String(
            getRowValue(
              row,
              "TYPE"
            ) || ""
          )
            .trim()
            .toUpperCase();


        /* ---------------------------------------------
         * QTY
         * --------------------------------------------- */

        const qty =
          Number(
            getRowValue(
              row,
              "QTY"
            ) || 0
          );


        /* ---------------------------------------------
         * VALIDATE LOT
         * --------------------------------------------- */

        if (!lot) {

          continue;

        }


        /* ---------------------------------------------
         * VALIDATE QTY
         * --------------------------------------------- */

        if (
          !Number.isFinite(qty) ||
          qty <= 0
        ) {

          continue;

        }


        /* =================================================
         * STOCK KEY
         * ================================================= */

        const key =
          `${lot}__${exp}`;


        /* =================================================
         * CREATE STOCK ITEM
         * ================================================= */

        if (
          !stockMap.has(
            key
          )
        ) {

          stockMap.set(
            key,
            {

              lot:
                lot,

              exp:
                exp,

              quantity:
                0

            }
          );

        }


        const item =
          stockMap.get(
            key
          );


        /* =================================================
         * IN
         *
         * เพิ่ม Stock
         * ================================================= */

        if (
          type === "IN" ||
          type === "RECEIVE" ||
          type === "RECEIVE_STOCK"
        ) {

          item.quantity +=
            qty;

        }


        /* =================================================
         * OUT
         *
         * ลด Stock
         * ================================================= */

        else if (
          type === "OUT" ||
          type === "DISPENSE"
        ) {

          item.quantity -=
            qty;

        }

      }


      /* =================================================
       * BUILD RESULT
       *
       * เอาเฉพาะ Stock ที่เหลือมากกว่า 0
       * ================================================= */

      const result =
        Array.from(
          stockMap.values()
        )
          .filter(
            item =>
              item.quantity > 0
          )
          .map(
            item => ({

              lot:
                item.lot,

              exp:
                item.exp,

              quantity:
                item.quantity

            })
          );


      /* =================================================
       * SORT
       *
       * เรียง LOT
       * ================================================= */

      result.sort(
        (
          a,
          b
        ) =>
          String(
            a.lot
          ).localeCompare(
            String(
              b.lot
            ),
            "th"
          )
      );


      /* =================================================
       * TOTAL
       * ================================================= */

      const total =
        result.reduce(
          (
            sum,
            item
          ) =>
            sum +
            Number(
              item.quantity ||
              0
            ),
          0
        );


      /* =================================================
       * LOG
       * ================================================= */

      console.log(
        "✅ VACCINE STOCK:",
        code,
        {
          lots:
            result.length,

          total:
            total,

          data:
            result
        }
      );


      /* =================================================
       * RESPONSE
       * ================================================= */

      return res.json({

        ok:
          true,

        data:
          result,

        total:
          total

      });


    } catch (err) {

      /* =================================================
       * ERROR
       * ================================================= */

      console.error(
        "❌ LOAD VACCINE STOCK ERROR:",
        err
      );


      return res.status(
        500
      ).json({

        ok:
          false,

        message:
          err.message

      });

    }

  }
);
/* =====================================================
   CALCULATE BALANCE MAP
===================================================== */

function calculateBalanceMap(
  rows
) {

  const map =
    new Map();


  for (
    const row of rows
  ) {

    const code =
      String(
        getRowValue(
          row,
          "CODE"
        ) || ""
      ).trim();


    if (!code) {

      continue;

    }


    const type =
      String(
        getRowValue(
          row,
          "TYPE"
        ) || ""
      )
        .trim()
        .toUpperCase();


    const qty =
      Number(
        getRowValue(
          row,
          "QTY"
        ) || 0
      );


    const key =
      code.toUpperCase();


    if (
      !map.has(key)
    ) {

      map.set(
        key,
        0
      );

    }


    if (
      type === "IN" ||
      type === "RECEIVE" ||
      type === "RECEIVE_STOCK"
    ) {

      map.set(
        key,
        map.get(key) + qty
      );

    }

    else if (
      type === "OUT" ||
      type === "DISPENSE"
    ) {

      map.set(
        key,
        map.get(key) - qty
      );

    }

  }


  return map;

}


/* =====================================================
   EXPORT
===================================================== */

module.exports =
  router;