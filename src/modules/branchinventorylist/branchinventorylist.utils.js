'use strict';
const clean = value => String(value ?? '').trim();
const normHeader = value => clean(value).replace(/^\uFEFF/, '').replace(/[\s_]+/g, '_').toUpperCase();

function parseMaster(values) {
  if (!Array.isArray(values) || values.length < 2) return [];
  const headers = values[0].map(normHeader);
  const index = Object.fromEntries(headers.map((h, i) => [h, i]));
  if (index.CODE === undefined || index.NAME === undefined || index.UNIT === undefined) {
    throw new Error('INVENTORY_MASTER ต้องมีคอลัมน์ CODE, NAME และ UNIT');
  }

  const byCode = new Map();
  for (const row of values.slice(1)) {
    const code = clean(row[index.CODE]).toUpperCase();
    if (!code || byCode.has(code)) continue;
    const match = code.match(/^EMER(\d{3})$/);
    const number = match ? Number(match[1]) : null;
    const rawRequired = index.REQUIRED === undefined ? 0 : Number(clean(row[index.REQUIRED]) || 0);
    const masterRequired = Number.isFinite(rawRequired) && rawRequired >= 0 ? rawRequired : 0;
    byCode.set(code, {
      code,
      number,
      mandatory: number !== null && number >= 1 && number <= 78,
      name: clean(row[index.NAME]),
      unit: clean(row[index.UNIT]),
      masterRequired
    });
  }

  return [...byCode.values()].sort((a, b) => {
    if (a.number !== null && b.number !== null) return a.number - b.number;
    if (a.number !== null) return -1;
    if (b.number !== null) return 1;
    return a.code.localeCompare(b.code, 'en');
  });
}


function includeMandatoryPlaceholders(master) {
  const items = Array.isArray(master) ? [...master] : [];
  const byCode = new Map(items.map(item => [clean(item.code).toUpperCase(), item]));
  for (let n = 1; n <= 78; n++) {
    const code = `EMER${String(n).padStart(3, '0')}`;
    if (!byCode.has(code)) {
      items.push({
        code, number: n,
        name: '⚠ กรุณาเพิ่มรายการนี้ใน INVENTORY_MASTER',
        unit: '—', masterRequired: 1,
        mandatory: true, missingFromMaster: true
      });
    }
  }
  return items.sort((a, b) => {
    if (a.number != null && b.number != null) return a.number - b.number;
    if (a.number != null) return -1;
    if (b.number != null) return 1;
    return String(a.code).localeCompare(String(b.code), 'en');
  });
}

function missingMandatory(master) {
  const codes = new Set((master || []).map(item => clean(item.code).toUpperCase()));
  const missing = [];
  for (let n = 1; n <= 78; n++) {
    const code = `EMER${String(n).padStart(3, '0')}`;
    if (!codes.has(code)) missing.push(code);
  }
  return missing;
}
module.exports = { parseMaster, missingMandatory, normHeader, includeMandatoryPlaceholders };
