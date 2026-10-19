const {
  readRows,
  appendRow
} = require("../../config/google");

const SHEET = "INVENTORY_MOVEMENT";
const MASTER_SHEET = "INVENTORY_MASTER";
const { withSequenceLock } = require("../../utils/running/sequence-lock");
const { getBangkokDateParts } = require("../../utils/running/bangkok-date");
const { maxAnnualSequence, formatAnnualNumber } = require("../../utils/running/annual-number-format");

/* =====================================================
   CLEAN
===================================================== */
function clean(v) {
  return v === undefined || v === null
    ? ""
    : String(v).trim();
}

/* =====================================================
   NORMALIZE MOVEMENT
===================================================== */
function normalizeMovement(row = {}) {
  return {
    movementId: clean(
      row.MOVEMENT_ID ??
      row.movement_id
    ),

    type: clean(
      row.TYPE ??
      row.type
    ).toUpperCase(),

    refNo: clean(
      row.REF_NO ??
      row.refNo ??
      row.receivestockNo
    ),

    dateIn: clean(
      row.DATE ??
      row.date ??
      row.dateIn
    ),

    code: clean(
      row.CODE ??
      row.code
    ),

    name: clean(
      row.NAME ??
      row.name
    ),

    qty: Number(
      row.QTY ??
      row.qty ??
      0
    ),

    unit: clean(
      row.UNIT ??
      row.unit
    ),

    lot: clean(
      row.LOT ??
      row.lot
    ),

    exp: clean(
      row.EXP ??
      row.exp
    ),

    supplier: clean(
      row.TARGET ??
      row.target ??
      row.supplier
    ),

    user: clean(
      row.USER ??
      row.user
    ),

    time: clean(
      row.TIME ??
      row.time
    ),

    branchId: clean(
      row.BRANCH_ID ??
      row.branchId
    ),

    location: clean(
      row.LOCATION ??
      row.Location ??
      row.location
    ),

    qrcode: clean(
      row.QRCODE ??
      row.qrcode
    ),

    containerId: clean(
      row.CONTAINER_ID ??
      row.containerId
    ),

    containerQr: clean(
      row.CONTAINER_QR ??
      row.containerQr
    )
  };
}

/* =====================================================
   GET INVENTORY MASTER
===================================================== */
async function getInventoryMaster() {

  const rows = await readRows(MASTER_SHEET);

  return (rows || [])
    .map(r => ({
      code: clean(
        r.CODE ??
        r.Code ??
        r.code
      ),

      name: clean(
        r.NAME ??
        r.Name ??
        r.name
      ),

      unit: clean(
        r.UNIT ??
        r.Unit ??
        r.unit
      )
    }))
    .filter(r => r.code);
}

/* =====================================================
   GET ALL RECEIVE STOCK
===================================================== */
async function getAllReceiveStock() {

  const rows = await readRows(SHEET);

  return (rows || [])
    .map(normalizeMovement)
    .filter(r => r.type === "IN");
}

/* =====================================================
   NEXT MOVEMENT ID
===================================================== */
async function getNextMovementId() {
  const rows = await readRows(SHEET);
  const now = new Date();
  const { yyyy: year } = getBangkokDateParts(now);
  const values = (rows || []).map(row => clean(row.MOVEMENT_ID ?? row.movement_id));
  const next = maxAnnualSequence(values, "MOVID", year) + 1;
  return formatAnnualNumber("MOVID", next, now);
}

/* =====================================================
   NEXT RECEIVE REF NO
   Format: RCINYYYYMM-XXXXX; sequence resets only on year change.
   Reads all existing records from the current year, regardless of month.
===================================================== */
async function getNextRefNoValue() {
  const rows = await readRows(SHEET);
  const now = new Date();
  const { yyyy: year } = getBangkokDateParts(now);
  const values = (rows || []).map(row => clean(row.REF_NO ?? row.refNo));
  const next = maxAnnualSequence(values, "RCIN", year) + 1;
  return formatAnnualNumber("RCIN", next, now);
}

/* =====================================================
   NEXT CONTAINER ID
   Format: CONTAINERYYYYMM-XXXXX; sequence resets annually.
   Legacy IDs are read to avoid restarting the sequence mid-year.
===================================================== */
async function getNextContainerId() {
  const rows = await readRows(SHEET);
  const now = new Date();
  const { yyyy: year } = getBangkokDateParts(now);
  const values = (rows || []).map(row => clean(row.CONTAINER_ID ?? row.containerId));
  const next = maxAnnualSequence(values, "CONTAINER", year) + 1;
  return formatAnnualNumber("CONTAINER", next, now);
}

/* =====================================================
   CALCULATE STOCK BALANCE
   -----------------------------------------------------
   คำนวณจาก Movement ทั้งหมด
   IN  = +
   OUT = -
===================================================== */
function calculateStockBalance(
  rows = [],
  target = {}
) {

  let balance = 0;

  for (const row of rows) {

    const movement =
      normalizeMovement(row);

    if (
      movement.branchId !==
      target.branchId
    ) {
      continue;
    }

    if (
      movement.code !==
      target.code
    ) {
      continue;
    }

    if (
      movement.lot !==
      target.lot
    ) {
      continue;
    }

    if (
      movement.exp !==
      target.exp
    ) {
      continue;
    }

    if (
      movement.location !==
      target.location
    ) {
      continue;
    }

    if (movement.type === "IN") {

      balance += movement.qty;

    } else if (
      movement.type === "OUT"
    ) {

      balance -= movement.qty;
    }
  }

  return balance;
}

/* =====================================================
   FIND EXISTING CONTAINER
   -----------------------------------------------------
   หา Container เดิมที่:

   BRANCH เดียวกัน
   CODE เดียวกัน
   LOT เดียวกัน
   EXP เดียวกัน
   LOCATION เดียวกัน

   และยังมี Stock เหลือ
===================================================== */
async function findExistingContainer({
  branchId = "",
  code = "",
  lot = "",
  exp = "",
  location = ""
} = {}) {

  const rows =
    await readRows(SHEET);

  if (!rows || rows.length === 0) {
    return null;
  }

  const normalized =
    rows.map(normalizeMovement);

  const target = {
    branchId: clean(branchId),
    code: clean(code),
    lot: clean(lot),
    exp: clean(exp),
    location: clean(location)
  };

  /* ===================================================
     หา Movement IN ล่าสุด
     ที่ตรงกับ Stock Group
  =================================================== */

  const candidates =
    normalized
      .filter(row => {

        return (
          row.type === "IN" &&

          row.branchId ===
          target.branchId &&

          row.code ===
          target.code &&

          row.lot ===
          target.lot &&

          row.exp ===
          target.exp &&

          row.location ===
          target.location &&

          row.containerId
        );
      })
      .sort(
        (a, b) =>
          String(b.time)
            .localeCompare(
              String(a.time)
            )
      );

  if (
    candidates.length === 0
  ) {
    return null;
  }

  /* ===================================================
     ตรวจแต่ละ Container
  =================================================== */

  const checkedContainers =
    new Set();

  for (const candidate of candidates) {

    const containerId =
      candidate.containerId;

    if (
      checkedContainers.has(
        containerId
      )
    ) {
      continue;
    }

    checkedContainers.add(
      containerId
    );

    /* -----------------------------------------------
       คำนวณ Stock ของ Container นี้
    ----------------------------------------------- */

    let balance = 0;

    for (const row of normalized) {

      if (
        row.containerId !==
        containerId
      ) {
        continue;
      }

      if (
        row.branchId !==
        target.branchId
      ) {
        continue;
      }

      if (
        row.code !==
        target.code
      ) {
        continue;
      }

      if (
        row.lot !==
        target.lot
      ) {
        continue;
      }

      if (
        row.exp !==
        target.exp
      ) {
        continue;
      }

      if (
        row.location !==
        target.location
      ) {
        continue;
      }

      if (
        row.type === "IN"
      ) {
        balance += row.qty;
      }

      if (
        row.type === "OUT"
      ) {
        balance -= row.qty;
      }
    }

    /* -----------------------------------------------
       Container ยังมี Stock
    ----------------------------------------------- */

    if (balance > 0) {

      return {
        containerId:
          candidate.containerId,

        containerQr:
          candidate.containerQr ||
          candidate.qrcode,

        qrcode:
          candidate.qrcode,

        balance
      };
    }
  }

  return null;
}

/* =====================================================
   CREATE QR URL
===================================================== */
function createQrCode(value) {

  return (
    "https://api.qrserver.com/v1/create-qr-code/" +
    `?size=200x200&data=${encodeURIComponent(value)}`
  );
}

/* =====================================================
   INSERT RECEIVE STOCK
===================================================== */
async function insertReceiveStockUnlocked(
  data = {}
) {

  /* ===================================================
     BASIC DATA
  =================================================== */

  const movementId =
    await getNextMovementId();

  // The submitted preview may be stale if another user received stock first.
  // Generate the final REF_NO from the latest sheet rows at save time.
  const refNo = await getNextRefNoValue();

  const now =
    new Date().toISOString();

  const branchId =
    clean(data.branchId);

  const code =
    clean(data.code);

  const lot =
    clean(data.lot);

  const exp =
    clean(data.exp);

  const location =
    clean(data.location);

  const qty =
    Number(data.qty);

  /* ===================================================
     VALIDATE
  =================================================== */

  if (!branchId) {
    throw new Error(
      "BRANCH_ID is required"
    );
  }

  if (!code) {
    throw new Error(
      "CODE is required"
    );
  }

  if (
    !Number.isFinite(qty) ||
    qty <= 0
  ) {
    throw new Error(
      "QTY must be greater than 0"
    );
  }

  /* ===================================================
     FIND EXISTING CONTAINER
  =================================================== */

  const existingContainer =
    await findExistingContainer({
      branchId,
      code,
      lot,
      exp,
      location
    });

  let containerId;
  let containerQr;
  let qrCode;

  /* ===================================================
     EXISTING CONTAINER
  =================================================== */

  if (existingContainer) {

    containerId =
      existingContainer.containerId;

    containerQr =
      existingContainer.containerQr;

    qrCode =
      existingContainer.qrcode;

    console.log(
      "♻️ REUSE EXISTING CONTAINER"
    );

    console.log(
      "CONTAINER_ID =",
      containerId
    );

    console.log(
      "CONTAINER_QR =",
      containerQr
    );

    console.log(
      "QRCODE =",
      qrCode
    );
  }

  /* ===================================================
     NEW CONTAINER
  =================================================== */

  else {

    containerId =
      await getNextContainerId();

    /*
      QR data ใช้ MOVEMENT_ID ของ
      Movement แรกที่สร้าง Container
    */

    containerQr =
      movementId;

    qrCode =
      createQrCode(
        containerQr
      );

    console.log(
      "🆕 NEW CONTAINER"
    );

    console.log(
      "CONTAINER_ID =",
      containerId
    );

    console.log(
      "CONTAINER_QR =",
      containerQr
    );

    console.log(
      "QRCODE =",
      qrCode
    );
  }

  /* ===================================================
     PAYLOAD
  =================================================== */

  const payload = {

    MOVEMENT_ID:
      movementId,

    TYPE:
      "IN",

    REF_NO:
      refNo,

    DATE:
      clean(data.dateIn) ||
      new Date()
        .toISOString()
        .slice(0, 10),

    CODE:
      code,

    NAME:
      clean(data.name),

    QTY:
      qty,

    UNIT:
      clean(data.unit),

    LOT:
      lot,

    EXP:
      exp,

    TARGET:
      clean(data.supplier),

    USER:
      clean(data.user),

    TIME:
      now,

    BRANCH_ID:
      branchId,

    LOCATION:
      location,

    QRCODE:
      qrCode,

    CONTAINER_ID:
      containerId,

    CONTAINER_QR:
      containerQr
  };

  /* ===================================================
     SAVE
  =================================================== */

  console.log(
    "=== INSERT RECEIVE STOCK ==="
  );

  console.log(
    "PAYLOAD =",
    payload
  );

  await appendRow(
    SHEET,
    payload
  );

  console.log(
    "✅ INVENTORY_MOVEMENT SAVED:",
    movementId,
    refNo
  );

  /* ===================================================
     RESPONSE
  =================================================== */

  return {

    ok: true,

    movementId,

    refNo,

    qrCode,

    containerId,

    containerQr,

    data:
      payload
  };
}

/* =====================================================
   EXPORT
===================================================== */
async function insertReceiveStock(data = {}) {
  // Serialize ID generation and the append so concurrent requests in this server
  // process cannot receive the same running numbers.
  return withSequenceLock("INVENTORY_MOVEMENT:receive", () => insertReceiveStockUnlocked(data));
}

module.exports = {

  getInventoryMaster,

  getAllReceiveStock,

  getNextMovementId,

  getNextRefNoValue,

  getNextContainerId,

  findExistingContainer,

  insertReceiveStock
};