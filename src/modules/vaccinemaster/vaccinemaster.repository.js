/* =========================================================

   VACCINE MASTER REPOSITORY

   FILE:

   src/modules/vaccinemaster/vaccinemaster.repository.js

   SOURCE:

   VACCINE_MASTER

   VACCINE_MOVEMENT

   หลักการ:

   - ลดการ read Google Sheet ซ้ำ

   - รองรับ VACCINE MASTER

   - รองรับ VACCINE STOCK IN / OUT

   - Stock คำนวณจาก VACCINE_MOVEMENT

   - LOT + EXP เป็นตัวแยก Stock

   - REF_NO : RCINYYYYMM-00001

   - MOVEMENT_ID : VMIYYYYMM00001

\========================================================= */

const {

  readRows,

  appendRow,

  updateRow,

  deleteRow

} = require("../../config/google");

/* =========================================================

   SHEETS

\========================================================= */

const MASTER_SHEET = "VACCINE_MASTER";

const MOVEMENT_SHEET = "VACCINE_MOVEMENT";

/* =========================================================

   CLEAN

\========================================================= */

function clean(value) {

  return (

    value === undefined ||

    value === null

  )

    ? ""

    : String(value).trim();

}

/* =========================================================

   GET ROW VALUE

\========================================================= */

function getRowValue(row = {}, field) {

  const wanted =

    String(field || "")

      .trim()

      .toUpperCase();

  const fieldText =

    String(field || "");

  const candidates = [

    field,

    fieldText.toUpperCase(),

    fieldText.toLowerCase(),

    fieldText.replace(

      /_([a-z])/g,

      (_, letter) => letter.toUpperCase()

    )

  ];

  for (const key of candidates) {

    if (

      key === undefined ||

      key === null

    ) {

      continue;

    }

    if (

      row[key] !== undefined &&

      row[key] !== null &&

      String(row[key]).trim() !== ""

    ) {

      return row[key];

    }

  }

  for (const key of Object.keys(row)) {

    if (

      String(key)

        .trim()

        .toUpperCase() === wanted

    ) {

      return row[key];

    }

  }

  return "";

}

/* =========================================================

   NORMALIZE VACCINE MASTER

\========================================================= */

function normalizeVaccine(row = {}) {

  return {

    code:

      clean(

        getRowValue(

          row,

          "CODE"

        )

      ),

    name:

      clean(

        getRowValue(

          row,

          "NAME"

        )

      ),

    THname:

      clean(

        getRowValue(

          row,

          "THname"

        ) ||

        getRowValue(

          row,

          "THNAME"

        )

      )

  };

}

/* =========================================================

   NORMALIZE MOVEMENT

\========================================================= */

function normalizeMovement(row = {}) {

  return {

    movementId:

      clean(

        getRowValue(

          row,

          "MOVEMENT_ID"

        )

      ),

    type:

      clean(

        getRowValue(

          row,

          "TYPE"

        )

      ).toUpperCase(),

    refNo:

      clean(

        getRowValue(

          row,

          "REF_NO"

        )

      ),

    date:

      clean(

        getRowValue(

          row,

          "DATE"

        )

      ),

    code:

      clean(

        getRowValue(

          row,

          "CODE"

        )

      ),

    name:

      clean(

        getRowValue(

          row,

          "NAME"

        )

      ),

    qty:

      Number(

        getRowValue(

          row,

          "QTY"

        ) || 0

      ),

    unit:

      clean(

        getRowValue(

          row,

          "UNIT"

        )

      ),

    lot:

      clean(

        getRowValue(

          row,

          "LOT"

        )

      ),

    exp:

      clean(

        getRowValue(

          row,

          "EXP"

        )

      ),

    target:

      clean(

        getRowValue(

          row,

          "TARGET"

        )

      ),

    user:

      clean(

        getRowValue(

          row,

          "USER"

        )

      ),

    time:

      clean(

        getRowValue(

          row,

          "TIME"

        )

      ),

    remark:

      clean(

        getRowValue(

          row,

          "REMARK"

        )

      ),

    location:

      clean(

        getRowValue(

          row,

          "Location"

        )

      ),

    qrcode:

      clean(

        getRowValue(

          row,

          "QRCODE"

        )

      )

  };

}

/* =========================================================

   NORMALIZE TYPE

\========================================================= */

function normalizeMovementType(type) {

  const value =

    clean(type)

      .toUpperCase();

  if (

    value === "RECEIVE" ||

    value === "RECEIVE_STOCK"

  ) {

    return "IN";

  }

  if (

    value === "DISPENSE"

  ) {

    return "OUT";

  }

  return value;

}

/* =========================================================

   IS IN

\========================================================= */

function isInType(type) {

  return (

    normalizeMovementType(type) === "IN"

  );

}

/* =========================================================

   IS OUT

\========================================================= */

function isOutType(type) {

  return (

    normalizeMovementType(type) === "OUT"

  );

}

/* =========================================================

   GET VACCINE MASTER

\========================================================= */

async function getVaccineMaster() {

  const rows =

    await readRows(

      MASTER_SHEET

    );

  return (

    rows || []

  )

    .map(

      normalizeVaccine

    )

    .filter(

      row => row.code

    );

}

/* =========================================================

   FIND VACCINE BY CODE

\========================================================= */

async function findVaccineByCode(code) {

  const wanted =

    clean(code);

  if (!wanted) {

    return null;

  }

  const rows =

    await readRows(

      MASTER_SHEET

    );

  return findVaccineInRows(

    rows,

    wanted

  );

}

/* =========================================================

   FIND VACCINE IN EXISTING ROWS

\========================================================= */

function findVaccineInRows(

  rows = [],

  code

) {

  const wanted =

    clean(code)

      .toUpperCase();

  if (!wanted) {

    return null;

  }

  const row =

    (rows || []).find(

      item => {

        const rowCode =

          clean(

            getRowValue(

              item,

              "CODE"

            )

          )

            .toUpperCase();

        return rowCode === wanted;

      }

    );

  if (!row) {

    return null;

  }

  return normalizeVaccine(row);

}

/* =========================================================

   CREATE VACCINE MASTER

\========================================================= */

async function createVaccineMaster(data = {}) {

  const code =

    clean(data.code);

  const name =

    clean(data.name);

  const THname =

    clean(data.THname);

  if (!code) {

    throw new Error(

      "CODE is required"

    );

  }

  if (!name) {

    throw new Error(

      "NAME is required"

    );

  }

  const rows =

    await readRows(

      MASTER_SHEET

    );

  const existing =

    findVaccineInRows(

      rows,

      code

    );

  if (existing) {

    throw new Error(

      `มี CODE ${code} อยู่แล้ว`

    );

  }

  const payload = {

    code,

    name,

    THname

  };

  console.log(

    "➕ CREATE VACCINE MASTER PAYLOAD:",

    payload

  );

  await appendRow(

    MASTER_SHEET,

    payload

  );

  console.log(

    "✅ VACCINE CREATED:",

    code

  );

  return {

    code,

    name,

    THname

  };

}

/* =========================================================

   UPDATE VACCINE MASTER

\========================================================= */

async function updateVaccineMaster(

  code,

  data = {}

) {

  const wanted =

    clean(code);

  if (!wanted) {

    throw new Error(

      "CODE is required"

    );

  }

  const name =

    clean(data.name);

  const THname =

    clean(data.THname);

  if (!name) {

    throw new Error(

      "NAME is required"

    );

  }

  if (!THname) {

    throw new Error(

      "THname is required"

    );

  }

  const rows =

    await readRows(

      MASTER_SHEET

    );

  const existing =

    findVaccineInRows(

      rows,

      wanted

    );

  if (!existing) {

    throw new Error(

      `ไม่พบวัคซีน ${wanted}`

    );

  }

  const payload = {

    code: wanted,

    name,

    THname

  };

  console.log(

    "📤 REPOSITORY → GOOGLE UPDATE:",

    {

      sheet: MASTER_SHEET,

      keyHeader: "code",

      keyValue: wanted,

      payload

    }

  );

  await updateRow(

    MASTER_SHEET,

    "code",

    wanted,

    payload

  );

  console.log(

    "✅ VACCINE UPDATED:",

    wanted

  );

  return {

    code: wanted,

    name,

    THname

  };

}

/* =========================================================

   DELETE VACCINE MASTER

\========================================================= */

async function deleteVaccineMaster(code) {

  const wanted =

    clean(code);

  if (!wanted) {

    throw new Error(

      "CODE is required"

    );

  }

  const rows =

    await readRows(

      MASTER_SHEET

    );

  const existing =

    findVaccineInRows(

      rows,

      wanted

    );

  if (!existing) {

    throw new Error(

      `ไม่พบวัคซีน ${wanted}`

    );

  }

  await deleteRow(

    MASTER_SHEET,

    "code",

    wanted

  );

  console.log(

    "🗑️ VACCINE DELETED:",

    wanted

  );

  return {

    code: wanted

  };

}

/* =========================================================

   BUILD REF NO FROM MOVEMENT ROWS

\========================================================= */

function buildNextStockRefNo(

  rows = [],

  now = new Date(),

  type = "IN"

) {

  const movementType = String(type || "IN")

    .trim()

    .toUpperCase();

  if (!["IN", "OUT"].includes(movementType)) {

    throw new Error("TYPE ต้องเป็น IN หรือ OUT");

  }

  const year = now.getFullYear();

  const month = String(now.getMonth() + 1).padStart(2, "0");

  const prefix = `RC${movementType}${year}${month}-`;

  let max = 0;

  for (const rawRow of rows || []) {

    const row = normalizeMovement(rawRow);

    const refNo = String(row.refNo || "").trim();

    if (!refNo.startsWith(prefix)) {

      continue;

    }

    const suffix = refNo.slice(prefix.length);

    if (!/^\d+$/.test(suffix)) {

      continue;

    }

    max = Math.max(max, Number(suffix));

  }

  const nextSequence = max + 1;

  return {

    REF_NO: `${prefix}${String(nextSequence).padStart(5, "0")}`,

    YEAR: year,

    MONTH: month,

    SEQUENCE: nextSequence

  };

}

/* =========================================================

   NEXT STOCK REF NO

\========================================================= */

async function getNextStockRefNo(type = "IN") {

  const rows = await readRows(MOVEMENT_SHEET);

  return buildNextStockRefNo(rows, new Date(), type);

}

/* =========================================================

   BUILD MOVEMENT ID FROM MOVEMENT ROWS

\========================================================= */

function buildNextMovementId(

  rows = [],

  now = new Date()

) {

  const year =

    now.getFullYear();

  const month =

    String(

      now.getMonth() + 1

    ).padStart(

      2,

      "0"

    );

  const prefix =

    `VMI${year}${month}`;

  let max = 0;

  for (const rawRow of rows || []) {

    const row =

      normalizeMovement(

        rawRow

      );

    const id =

      row.movementId;

    if (

      !id.startsWith(prefix)

    ) {

      continue;

    }

    const match =

      id.match(

        /(\d+)$/

      );

    if (!match) {

      continue;

    }

    const sequence =

      Number(

        match[1]

      );

    if (

      Number.isFinite(sequence)

    ) {

      max =

        Math.max(

          max,

          sequence

        );

    }

  }

  return (

    `${prefix}${String(

      max + 1

    ).padStart(

      5,

      "0"

    )}`

  );

}

/* =========================================================

   NEXT MOVEMENT ID

\========================================================= */

async function getNextMovementId() {

  const rows =

    await readRows(

      MOVEMENT_SHEET

    );

  return buildNextMovementId(

    rows

  );

}

/* =========================================================

   BUILD VACCINE STOCK FROM MOVEMENT ROWS

\========================================================= */

function buildVaccineStock(

  rows = [],

  code

) {

  const wanted =

    clean(code)

      .toUpperCase();

  if (!wanted) {

    return [];

  }

  const stockMap =

    new Map();

  for (const rawRow of rows || []) {

    const row =

      normalizeMovement(

        rawRow

      );

    if (

      row.code.toUpperCase() !==

      wanted

    ) {

      continue;

    }

    if (!row.lot) {

      continue;

    }

    if (

      !Number.isFinite(row.qty) ||

      row.qty <= 0

    ) {

      continue;

    }

    const key =

      `${row.lot}__${row.exp}`;

    if (

      !stockMap.has(key)

    ) {

      stockMap.set(

        key,

        {

          lot:

            row.lot,

          exp:

            row.exp,

          quantity:

            0,

          unit:

            row.unit,

          code:

            row.code,

          name:

            row.name

        }

      );

    }

    const item =

      stockMap.get(key);

    if (

      isInType(row.type)

    ) {

      item.quantity +=

        row.qty;

    }

    else if (

      isOutType(row.type)

    ) {

      item.quantity -=

        row.qty;

    }

  }

  return Array.from(

    stockMap.values()

  )

    .filter(

      item =>

        item.quantity > 0

    )

    .sort(

      (a, b) =>

        String(a.lot)

          .localeCompare(

            String(b.lot),

            "th"

          )

    );

}

/* =========================================================

   GET VACCINE STOCK

\========================================================= */

async function getVaccineStock(code) {

  const wanted =

    clean(code);

  if (!wanted) {

    return [];

  }

  const rows =

    await readRows(

      MOVEMENT_SHEET

    );

  return buildVaccineStock(

    rows,

    wanted

  );

}

/* =========================================================

   CREATE VACCINE STOCK

\========================================================= */

async function createVaccineStock(

  data = {}

) {

  /* =======================================================

     BASIC DATA

  ======================================================= */

  const type =

    clean(

      data.type || "IN"

    ).toUpperCase();

  const code =

    clean(data.code);

  const name =

    clean(data.name);

  const qty =

    Number(data.qty);

  const unit =

    clean(data.unit);

  const lot =

    clean(data.lot);

  const exp =

    clean(data.exp);

  const date =

    clean(data.date);

  const user =

    clean(data.user);

  const location =

    clean(data.location);

  const target =

    clean(data.target);

  const remark =

    clean(data.remark);

  /* =======================================================

     VALIDATE TYPE

  ======================================================= */

  if (

    type !== "IN" &&

    type !== "OUT"

  ) {

    throw new Error(

      "Vaccine Stock รองรับ TYPE = IN หรือ OUT"

    );

  }

  /* =======================================================

     VALIDATE REQUIRED

  ======================================================= */

  if (!code) {

    throw new Error(

      "กรุณาระบุ CODE"

    );

  }

  if (!name) {

    throw new Error(

      "กรุณาระบุ NAME"

    );

  }

  if (

    !Number.isFinite(qty) ||

    qty <= 0

  ) {

    throw new Error(

      "QTY ไม่ถูกต้อง"

    );

  }

  if (!unit) {

    throw new Error(

      "กรุณาระบุ UNIT"

    );

  }

  if (!lot) {

    throw new Error(

      "กรุณาระบุ LOT"

    );

  }

  if (!exp) {

    throw new Error(

      "กรุณาระบุ EXP"

    );

  }

  if (!date) {

    throw new Error(

      "กรุณาระบุ DATE"

    );

  }

  if (!user) {

    throw new Error(

      "กรุณาระบุ USER"

    );

  }

  /* =======================================================

     READ VACCINE MASTER

  ======================================================= */

  const masterRows =

    await readRows(

      MASTER_SHEET

    );

  const vaccine =

    findVaccineInRows(

      masterRows,

      code

    );

  if (!vaccine) {

    throw new Error(

      `ไม่พบ CODE ${code} ใน VACCINE_MASTER`

    );

  }

  /* =======================================================

     READ MOVEMENT

     อ่านครั้งเดียว

     ใช้สำหรับ:

     - ตรวจ Stock

     - Movement ID

     - REF NO

  ======================================================= */

  const movementRows =

    await readRows(

      MOVEMENT_SHEET

    );

  /* =======================================================

     OUT STOCK VALIDATION

  ======================================================= */

  if (

    type === "OUT"

  ) {

    const currentStock =

      buildVaccineStock(

        movementRows,

        code

      );

    const normalizeDate = value => {

      const text = clean(value);

      if (!text) return "";

      const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

      if (iso) {

        return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;

      }

      const mdy = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

      if (mdy) {

        return `${mdy[3]}-${mdy[1].padStart(2, "0")}-${mdy[2].padStart(2, "0")}`;

      }

      return text;

    };

    const wantedExp = normalizeDate(exp);

    const available =

      currentStock

        .filter(row =>

          String(row.lot || "").trim() === lot &&

          normalizeDate(row.exp) === wantedExp

        )

        .reduce(

          (total, row) => total + Number(row.quantity || 0),

          0

        );

    if (

      qty > available

    ) {

      throw new Error(

        `Stock ไม่เพียงพอ LOT ${lot} คงเหลือ ${available}`

      );

    }

  }

  /* =======================================================

     GENERATE ID

  ======================================================= */

  const now =

    new Date();

  const movementId =

    buildNextMovementId(

      movementRows,

      now

    );

  /* =======================================================

     GENERATE REF NO

  ======================================================= */

  const refData =

    buildNextStockRefNo(

      movementRows,

      now,

      type

    );

  const refNo =

    refData.REF_NO;

  /* =======================================================

     TIMESTAMP

  ======================================================= */

  const timestamp =

    now.toISOString();

  /* =======================================================

     FINAL NAME

     ใช้ชื่อจาก MASTER เป็นหลัก

  ======================================================= */

  const finalName =

    vaccine.name ||

    name;

  /* =======================================================

     QR CODE

     ค่า QR = MOVEMENT_ID

  ======================================================= */

  const qrValue =

    movementId;

  const qrcode =

    `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(

      qrValue

    )}`;

  /* =======================================================

     PAYLOAD

  ======================================================= */

  const payload = {

    MOVEMENT_ID:

      movementId,

    TYPE:

      type,

    REF_NO:

      refNo,

    DATE:

      date,

    CODE:

      code,

    NAME:

      finalName,

    QTY:

      qty,

    UNIT:

      unit,

    LOT:

      lot,

    EXP:

      exp,

    TARGET:

      target,

    USER:

      user,

    TIME:

      timestamp,

    REMARK:

      remark,

    Location:

      location,

    QRCODE:

      qrcode

  };

  /* =======================================================

     LOG

  ======================================================= */

  console.log(

    "💉 CREATE VACCINE STOCK:",

    payload

  );

  /* =======================================================

     SAVE

  ======================================================= */

  await appendRow(

    MOVEMENT_SHEET,

    payload

  );

  /* =======================================================

     SUCCESS

  ======================================================= */

  console.log(

    "✅ VACCINE STOCK SAVED:",

    {

      type,

      movementId,

      refNo

    }

  );

  return {

    ok:

      true,

    movementId,

    refNo,

    qrcode,

    data:

      payload

  };

}


/* =========================================================
   GET VACCINE DISPENSE HISTORY
   อ่าน VACCINE_MOVEMENT เฉพาะ TYPE = OUT
========================================================= */



async function getVaccineDispenseHistory() {
  console.log("[Vaccine Movement] Reading sheet:", MOVEMENT_SHEET);

  const rows = await readRows(MOVEMENT_SHEET);

  console.log("[Vaccine Movement] Raw row count:", rows?.length ?? "null");
  console.log("[Vaccine Movement] First raw row:", rows?.[0] ?? null);
  console.log(
    "[Vaccine Movement] Raw headers:",
    rows?.[0] ? Object.keys(rows[0]) : []
  );

  return (rows || []).map(normalizeMovement);
}





module.exports = {
  getVaccineMaster,
  findVaccineByCode,
  findVaccineInRows,
  createVaccineMaster,
  updateVaccineMaster,
  deleteVaccineMaster,
  getNextStockRefNo,
  getNextMovementId,
  getVaccineStock,
  buildVaccineStock,
  buildNextStockRefNo,
  buildNextMovementId,
  createVaccineStock,

  // ประวัติการจ่ายวัคซีน TYPE = OUT
  getVaccineDispenseHistory
};
