/* Calendar date used for running numbers: Gregorian year in Asia/Bangkok. */
function getBangkokDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  const yyyy = String(values.year);
  const mm = String(values.month).padStart(2, '0');
  const dd = String(values.day).padStart(2, '0');
  return { yyyy, mm, dd, year: Number(yyyy), month: Number(mm), day: Number(dd), dateKey: `${yyyy}${mm}${dd}` };
}

module.exports = { getBangkokDateParts };
