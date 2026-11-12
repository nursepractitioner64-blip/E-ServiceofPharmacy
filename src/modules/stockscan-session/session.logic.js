'use strict';

const REQUIRED_COUNT_HEADERS = [
  'SESSION_ID', 'MOVEMENT_ID', 'CODE', 'NAME',
  'QTY', 'USER', 'TIME', 'BRANCH_ID'
];
const REQUIRED_RESULT_HEADERS = [
  'SESSION', 'CODE', 'REQUIRED', 'ACTUAL', 'DIFF', 'BRANCH_ID'
];

function clean(value) {
  return String(value ?? '').trim();
}

function normalizeHeaders(row = []) {
  return row.map(value => clean(value).replace(/^\uFEFF/, '').toUpperCase());
}

function headerIndex(headers, name) {
  return normalizeHeaders(headers).indexOf(name);
}

function toNumber(value, label = 'จำนวน') {
  const parsed = Number(String(value ?? '').replace(/,/g, '').trim());
  if (!Number.isFinite(parsed)) throw new Error(`${label} ไม่ถูกต้อง`);
  return parsed;
}

function assertHeaders(actual, required, sheetName) {
  const normalized = normalizeHeaders(actual);
  const missing = required.filter(name => !normalized.includes(name));
  if (missing.length) {
    throw new Error(`${sheetName} ขาดคอลัมน์: ${missing.join(', ')}`);
  }
  return normalized;
}

function rowsToObjects(values = []) {
  if (!Array.isArray(values) || values.length < 2) return [];
  const headers = normalizeHeaders(values[0]);
  return values.slice(1).map((row, index) => {
    const out = { __rowNumber: index + 2 };
    headers.forEach((header, i) => {
      if (header) out[header] = row[i] ?? '';
    });
    return out;
  });
}

function createSessionId(now = new Date(), random = Math.random().toString(36).slice(2, 8).toUpperCase()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `SS${values.year}${values.month}${values.day}-${now.getTime()}-${random}`;
}

function validateCountItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('ไม่มีรายการสำหรับบันทึก');
  }
  const seen = new Set();
  return items.map((item, index) => {
    const movementId = clean(item?.movement_id || item?.MOVEMENT_ID);
    if (!movementId) throw new Error(`รายการที่ ${index + 1} ไม่มี MOVEMENT_ID`);
    if (seen.has(movementId)) throw new Error(`พบรายการสแกนซ้ำในชุดข้อมูล: ${movementId}`);
    seen.add(movementId);
    const qty = toNumber(item?.qty ?? item?.QTY ?? 1, 'จำนวนที่ตรวจนับ');
    if (qty <= 0) throw new Error('จำนวนที่ตรวจนับต้องมากกว่า 0');
    return { movementId, qty };
  });
}

function buildSessionResult({ sessionId, branchId, masterRows, countRows }) {
  const actualByCode = new Map();
  for (const row of countRows) {
    if (clean(row.SESSION_ID) !== clean(sessionId)) continue;
    if (clean(row.BRANCH_ID) !== clean(branchId)) continue;
    const code = clean(row.CODE);
    if (!code) continue;
    actualByCode.set(code, (actualByCode.get(code) || 0) + toNumber(row.QTY || 0, 'QTY'));
  }

  const requiredByCode = new Map();
  for (const row of masterRows) {
    const code = clean(row.CODE);
    if (!code || requiredByCode.has(code)) continue;
    requiredByCode.set(code, toNumber(row.REQUIRED || 0, `REQUIRED ของ ${code}`));
  }

  return [...requiredByCode.entries()].map(([code, required]) => {
    const actual = actualByCode.get(code) || 0;
    return [clean(sessionId), code, required, actual, actual - required, clean(branchId)];
  });
}

module.exports = {
  REQUIRED_COUNT_HEADERS,
  REQUIRED_RESULT_HEADERS,
  clean,
  normalizeHeaders,
  headerIndex,
  assertHeaders,
  rowsToObjects,
  createSessionId,
  validateCountItems,
  buildSessionResult
};
