const { getBangkokDateParts } = require('./bangkok-date');

/**
 * Read annual sequence from both the current format PREFIXYYYYMM-XXXXX and
 * legacy formats PREFIXYYYY-XXXXX / PREFIX-YYYYMM-XXXXX. Legacy values are
 * counted for the same year so migration does not restart at 00001 mid-year.
 */
function extractAnnualSequence(value, prefix, year) {
  const text = String(value ?? '').trim();
  const pfx = String(prefix ?? '');
  if (!text || !pfx || !text.startsWith(pfx)) return 0;

  let tail = text.slice(pfx.length).trim();
  // Legacy formats sometimes included a hyphen between prefix and year.
  tail = tail.replace(/^[-_]/, '');

  let match = tail.match(/^(\d{4})(\d{2})-(\d+)$/); // PREFIXYYYYMM-XXXXX
  if (match && match[1] === String(year)) return Number(match[3]) || 0;

  match = tail.match(/^(\d{4})-(\d+)$/); // PREFIXYYYY-XXXXX
  if (match && match[1] === String(year)) return Number(match[2]) || 0;

  match = tail.match(/^(\d{4})(\d{5})$/); // PREFIXYYYYXXXXX legacy no dash
  if (match && match[1] === String(year)) return Number(match[2]) || 0;

  return 0;
}

function maxAnnualSequence(values, prefix, year) {
  let max = 0;
  for (const value of values || []) {
    max = Math.max(max, extractAnnualSequence(value, prefix, year));
  }
  return max;
}

function formatAnnualNumber(prefix, sequence, now = new Date(), width = 5) {
  const { yyyy, mm } = getBangkokDateParts(now);
  return `${String(prefix)}${yyyy}${mm}-${String(sequence).padStart(width, '0')}`;
}

function nextAnnualNumberFromValues(values, prefix, now = new Date(), width = 5) {
  const { yyyy } = getBangkokDateParts(now);
  return formatAnnualNumber(prefix, maxAnnualSequence(values, prefix, yyyy) + 1, now, width);
}

module.exports = { extractAnnualSequence, maxAnnualSequence, formatAnnualNumber, nextAnnualNumberFromValues };
