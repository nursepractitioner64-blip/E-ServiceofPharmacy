const { getSheets } = require("../../config/google");
const { getBangkokDateParts } = require("./bangkok-date");
const { maxAnnualSequence, formatAnnualNumber } = require("./annual-number-format");
const { withSequenceLock } = require("./sequence-lock");
const lastGenerated = new Map();

async function nextAnnualSheetNumber({ sheet, column, prefix, width = 5 }) {
  if (!sheet || !column || !prefix) throw new Error("sheet, column and prefix are required");
  return withSequenceLock(`${sheet}:${column}:${prefix}`, async () => {
    const now = new Date();
    const { yyyy: year } = getBangkokDateParts(now);
    const sheets = await getSheets();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${sheet}!${column}:${column}`
    });
    const values = (response.data.values || []).flat().map(v => String(v || "").trim());
    const key = `${sheet}:${column}:${prefix}:${year}`;
    const sheetMax = maxAnnualSequence(values, prefix, year);
    const next = Math.max(lastGenerated.get(key) || 0, sheetMax) + 1;
    lastGenerated.set(key, next);
    return formatAnnualNumber(prefix, next, now, width);
  });
}

module.exports = { nextAnnualSheetNumber };
