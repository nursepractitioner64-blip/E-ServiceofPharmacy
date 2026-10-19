const repository = require("./dispense.repository");
const { withSequenceLock } = require("../../utils/running/sequence-lock");
const { getBangkokDateParts } = require("../../utils/running/bangkok-date");
const { maxAnnualSequence, formatAnnualNumber } = require("../../utils/running/annual-number-format");

async function getMovementId() {
  return withSequenceLock("STOCK_MOVEMENT:MOVEMENT_ID", async () => {
    const now = new Date();
    const { yyyy: year } = getBangkokDateParts(now);
    const rows = await repository.getStockMovements();
    const values = (rows || []).map(row => row.movementId);
    const next = maxAnnualSequence(values, "MOV", year) + 1;
    return formatAnnualNumber("MOV", next, now);
  });
}

async function getRefNo() {
  return withSequenceLock("STOCK_MOVEMENT:RCOUT", async () => {
    const now = new Date();
    const { yyyy: year } = getBangkokDateParts(now);
    const rows = await repository.getStockMovements();
    const values = (rows || []).map(row => row.refNo);
    const next = maxAnnualSequence(values, "RCOUT", year) + 1;
    return formatAnnualNumber("RCOUT", next, now);
  });
}

module.exports = { getMovementId, getRefNo };
