const repo = require("./running.repository");
const { getBangkokDateParts } = require("./bangkok-date");
const { maxAnnualSequence, formatAnnualNumber } = require("./annual-number-format");

function pad(num, size = 5) {
  return String(num).padStart(size, "0");
}

function normalizeConfig(input) {
  if (input && typeof input === "object") {
    return {
      prefix: String(input.prefix || ""),
      sheet: String(input.sheet || "STOCK_MOVEMENT"),
      column: String(input.column || "C")
    };
  }
  return { prefix: String(input || ""), sheet: "STOCK_MOVEMENT", column: "C" };
}

async function generate(input) {
  const config = normalizeConfig(input);
  if (!config.prefix) throw new Error("Running number prefix is required");
  const now = new Date();
  const { yyyy: year } = getBangkokDateParts(now);
  const values = await repo.getColumnValues(`${config.sheet}!${config.column}:${config.column}`);
  const next = maxAnnualSequence(values, config.prefix, year) + 1;
  return formatAnnualNumber(config.prefix, next, now);
}

module.exports = { generate, generateRunningNumber: generate };
