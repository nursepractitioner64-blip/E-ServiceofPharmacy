const repo = require("./receivedrug.repository");
const { withSequenceLock } = require("../../utils/running/sequence-lock");
const { getBangkokDateParts } = require("../../utils/running/bangkok-date");
const { maxAnnualSequence, formatAnnualNumber } = require("../../utils/running/annual-number-format");

exports.getDrugMaster = async () => repo.getDrugMaster();
exports.getList = async () => repo.getReceiveList();

function dateParts(now = new Date()) {
  const { yyyy, dateKey } = getBangkokDateParts(now);
  return { yyyy, dateKey };
}

function maxSequenceFromRows(rows, field, prefix, year) {
  const values = (rows || []).map(row => {
    if (field === "MOVEMENT_ID") return row?.MOVEMENT_ID ?? row?.movementId;
    if (field === "RECEIVE_NO") return row?.RECEIVE_NO ?? row?.receiveNo;
    return row?.[field];
  });
  return maxAnnualSequence(values, prefix, year);
}

async function buildNextReceiveNo(now = new Date()) {
  const { yyyy, dateKey } = dateParts(now);
  const rows = await repo.getReceiveList();
  const max = maxSequenceFromRows(rows, "RECEIVE_NO", "RCIC", yyyy);
  return formatAnnualNumber("RCIC", max + 1, now);
}

async function buildNextMovementNo(now = new Date()) {
  const { yyyy, dateKey } = dateParts(now);
  const rows = await repo.getStockMovements();
  const max = maxSequenceFromRows(rows, "MOVEMENT_ID", "MV", yyyy);
  return formatAnnualNumber("MV", max + 1, now);
}

// Preview endpoints: actual create() recalculates under a lock before writing.
exports.getRunningNo = async () => buildNextReceiveNo();
exports.getMovementRunningNo = async () => buildNextMovementNo();

exports.create = async (data = {}) => withSequenceLock("DRUG_RECEIVE:annual-running", async () => {
  const receiveNo = await buildNextReceiveNo();
  const record = { ...data, receiveNo };
  await repo.insertReceiveDrug(record);

  const movementId = await buildNextMovementNo();
  record.movementId = movementId;
  await repo.insertStockMovement(record);

  return { receiveNo, movementId };
});
