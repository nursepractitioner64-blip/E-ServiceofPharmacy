const { getBangkokDateParts } = require("./bangkok-date");

function formatRunning(prefix, number) {
  const { yyyy, mm } = getBangkokDateParts();
  return `${prefix}${yyyy}${mm}-${String(number).padStart(5, "0")}`;
}

module.exports = { formatRunning };
