const repository =
require("./dispense.repository");

// ======================
// MOVEMENT RUNNING
// รีเซ็ตทุกวัน
// ======================

let movementSeq = 0;

let currentDate = null;

// ======================
function yyyymmdd() {

  const d =
    new Date();

  return (
    d.getFullYear() +
    String(
      d.getMonth() + 1
    ).padStart(2, "0") +
    String(
      d.getDate()
    ).padStart(2, "0")
  );

}

// ======================
function currentYear() {

  return String(
    new Date()
      .getFullYear()
  );

}

// ======================
function resetMovement() {

  const today =
    yyyymmdd();

  if (
    currentDate !== today
  ) {

    movementSeq = 0;

    currentDate =
      today;

  }

}

// ======================
// MOVYYYYMMDD-00001
// ======================
function getMovementId() {

  resetMovement();

  movementSeq++;

  return (
    "MOV" +
    yyyymmdd() +
    "-" +
    String(
      movementSeq
    ).padStart(
      5,
      "0"
    )
  );

}

// ======================
// RCOUTYYYYMMDD-00001
// รันต่อเนื่องทั้งปี
// รีเซ็ตปีใหม่
// ======================
let refCacheYear = "";
let refSeq = 0;

async function getRefNo() {

const year =
currentYear();

if (
refCacheYear !== year
){

const rows =
await repository
.getStockMovements();

const refs =
rows
.map(
r =>
String(
r.refNo||""
)
.trim()
)
.filter(
v =>
v.startsWith(
`RCOUT`
)
);

refSeq =
refs.length
? Math.max(
...refs.map(
v=>
Number(
v.split("-")[1]
)||0
)
)
:0;

refCacheYear =
year;

}

refSeq++;

return (

"RCOUT"+

yyyymmdd()+

"-"+

String(
refSeq
)
.padStart(
5,
"0"
)

);

}

module.exports = {

  getMovementId,

  getRefNo

};