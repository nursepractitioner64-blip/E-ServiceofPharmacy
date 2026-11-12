'use strict';

const crypto = require('crypto');
const { getSheets, getSpreadsheetId } = require('../../config/google');
const {
  REQUIRED_COUNT_HEADERS,
  REQUIRED_RESULT_HEADERS,
  clean,
  assertHeaders,
  rowsToObjects,
  createSessionId,
  validateCountItems,
  buildSessionResult
} = require('./session.logic');

const SHEETS = {
  master: 'INVENTORY_MASTER',
  movement: 'INVENTORY_MOVEMENT',
  count: 'COUNT_SESSION',
  result: 'SESSION_RESULT'
};

let writeQueue = Promise.resolve();
function withWriteLock(task) {
  const current = writeQueue.then(task, task);
  writeQueue = current.catch(() => undefined);
  return current;
}

async function readValues(range) {
  const sheets = await getSheets();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range
  });
  return response.data.values || [];
}

async function appendValues(range, values) {
  const sheets = await getSheets();
  return sheets.spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(),
    range,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values }
  });
}

function requireSheetHeaders(values, required, sheetName, exactPrefix = false) {
  if (!values.length) throw new Error(`ไม่พบ Header ของ Sheet ${sheetName}`);
  const normalized = assertHeaders(values[0], required, sheetName);
  if (exactPrefix) {
    const actualPrefix = normalized.slice(0, required.length);
    if (actualPrefix.join('|') !== required.join('|')) {
      throw new Error(`ลำดับ Header ของ ${sheetName} ไม่ตรงกับ Schema ที่กำหนด: ${required.join(', ')}`);
    }
  }
  return normalized;
}

async function getMovementForBranch(scanValue, branchId) {
  const values = await readValues(`${SHEETS.movement}!A:R`);
  if (!values.length) throw new Error('ไม่พบข้อมูล INVENTORY_MOVEMENT');
  const headers = requireSheetHeaders(values, [
    'MOVEMENT_ID', 'CODE', 'NAME', 'QTY', 'UNIT', 'LOT', 'EXP', 'BRANCH_ID'
  ], SHEETS.movement);
  const rows = rowsToObjects(values);
  const token = clean(scanValue).toUpperCase();
  const branchRows = rows.filter(row => clean(row.BRANCH_ID) === clean(branchId));
  const matches = branchRows.filter(row => [row.MOVEMENT_ID, row.QRCODE]
    .some(value => clean(value).toUpperCase() === token));

  if (!matches.length) {
    const elsewhere = rows.some(row => [row.MOVEMENT_ID, row.QRCODE]
      .some(value => clean(value).toUpperCase() === token));
    const error = new Error(elsewhere
      ? 'รายการนี้อยู่คนละสาขา ไม่สามารถนำมาตรวจนับได้'
      : 'ไม่พบ QR Code หรือ MOVEMENT_ID ใน INVENTORY_MOVEMENT');
    error.status = elsewhere ? 403 : 404;
    throw error;
  }
  if (matches.length > 1) {
    const error = new Error('QR Code นี้ตรงกับข้อมูลหลายรายการ กรุณาตรวจสอบ INVENTORY_MOVEMENT');
    error.status = 409;
    throw error;
  }
  const row = matches[0];
  return {
    movement_id: clean(row.MOVEMENT_ID),
    code: clean(row.CODE),
    name: clean(row.NAME),
    qty: Number(row.QTY || 0),
    unit: clean(row.UNIT),
    lot: clean(row.LOT),
    exp: clean(row.EXP),
    branch_id: clean(row.BRANCH_ID),
    location: clean(row.LOCATION),
    qrcode: clean(row.QRCODE)
  };
}

async function createSession({ branchId, user }) {
  const id = createSessionId();
  return {
    session_id: id,
    branch_id: clean(branchId),
    user: {
      user_id: clean(user?.userId),
      username: clean(user?.username),
      full_name: clean(user?.fullName || user?.username)
    }
  };
}

async function saveCountItems({ sessionId, branchId, user, items }) {
  return withWriteLock(async () => {
    const normalized = validateCountItems(items);
    const countValues = await readValues(`${SHEETS.count}!A:I`);
    const headers = requireSheetHeaders(countValues, REQUIRED_COUNT_HEADERS, SHEETS.count, true);
    const existing = rowsToObjects(countValues);

    const session = clean(sessionId);
    const branch = clean(branchId);
    if (!session) throw new Error('ไม่พบ SESSION_ID');

    const duplicateIds = new Set(existing
      .filter(row => clean(row.SESSION_ID) === session && clean(row.BRANCH_ID) === branch)
      .map(row => clean(row.MOVEMENT_ID)));

    for (const item of normalized) {
      if (duplicateIds.has(item.movementId)) {
        const error = new Error(`สแกนรายการนี้ไปแล้วใน SESSION นี้: ${item.movementId}`);
        error.status = 409;
        throw error;
      }
    }

    const movementRows = await Promise.all(normalized.map(item =>
      getMovementForBranch(item.movementId, branch)));

    const userName = clean(user?.fullName || user?.username || '');
    if (!userName) throw new Error('ไม่พบข้อมูลผู้ใช้งานจาก Session');
    const timestamp = new Date().toISOString();
    const values = movementRows.map((movement, index) => [
      session,
      movement.movement_id,
      movement.code,
      movement.name,
      normalized[index].qty,
      userName,
      timestamp,
      branch
    ]);

    const response = await appendValues(`${SHEETS.count}!A:H`, values);
    const updatedRows = Number(response.data?.updates?.updatedRows || 0);
    const updatedRange = response.data?.updates?.updatedRange || '';
    if (!updatedRange || updatedRows !== values.length) {
      const error = new Error('Google Sheets ไม่ยืนยันการบันทึกรายการครบถ้วน กรุณาตรวจสอบ COUNT_SESSION ก่อนส่งซ้ำ');
      error.status = 502;
      error.saved = updatedRows;
      error.expected = values.length;
      throw error;
    }

    return { saved: updatedRows, updated_range: updatedRange, branch_id: branch };
  });
}

async function getSessionItems({ sessionId, branchId }) {
  const [countValues, movementValues] = await Promise.all([
    readValues(`${SHEETS.count}!A:I`),
    readValues(`${SHEETS.movement}!A:R`)
  ]);
  requireSheetHeaders(countValues, REQUIRED_COUNT_HEADERS, SHEETS.count, true);
  requireSheetHeaders(movementValues, ['MOVEMENT_ID', 'LOT', 'EXP', 'BRANCH_ID'], SHEETS.movement);
  const movementById = new Map(rowsToObjects(movementValues)
    .filter(row => clean(row.BRANCH_ID) === clean(branchId))
    .map(row => [clean(row.MOVEMENT_ID), row]));
  return rowsToObjects(countValues)
    .filter(row => clean(row.SESSION_ID) === clean(sessionId) && clean(row.BRANCH_ID) === clean(branchId))
    .map(row => {
      const movement = movementById.get(clean(row.MOVEMENT_ID)) || {};
      return {
        session_id: clean(row.SESSION_ID), movement_id: clean(row.MOVEMENT_ID),
        code: clean(row.CODE), name: clean(row.NAME), qty: Number(row.QTY || 0),
        user: clean(row.USER), time: clean(row.TIME), branch_id: clean(row.BRANCH_ID),
        lot: clean(movement.LOT), exp: clean(movement.EXP)
      };
    });
}

async function closeSession({ sessionId, branchId }) {
  return withWriteLock(async () => {
    const session = clean(sessionId);
    const branch = clean(branchId);
    if (!session) throw new Error('ไม่พบ SESSION_ID');

    const [masterValues, countValues, resultValues] = await Promise.all([
      readValues(`${SHEETS.master}!A:D`),
      readValues(`${SHEETS.count}!A:I`),
      readValues(`${SHEETS.result}!A:F`)
    ]);

    requireSheetHeaders(masterValues, ['CODE', 'NAME', 'UNIT', 'REQUIRED'], SHEETS.master, true);
    requireSheetHeaders(countValues, REQUIRED_COUNT_HEADERS, SHEETS.count, true);
    requireSheetHeaders(resultValues, REQUIRED_RESULT_HEADERS, SHEETS.result, true);

    const masterRows = rowsToObjects(masterValues);
    const countRows = rowsToObjects(countValues);
    const resultRows = rowsToObjects(resultValues);
    const items = countRows.filter(row => clean(row.SESSION_ID) === session && clean(row.BRANCH_ID) === branch);
    if (!items.length) {
      const error = new Error('ไม่พบรายการสแกนใน SESSION และสาขาที่เลือก');
      error.status = 404;
      throw error;
    }

    const alreadyClosed = resultRows.some(row => clean(row.SESSION) === session && clean(row.BRANCH_ID) === branch);
    if (alreadyClosed) {
      const error = new Error('SESSION นี้ถูกสรุปผลแล้ว ไม่สามารถปิดซ้ำได้');
      error.status = 409;
      throw error;
    }

    const result = buildSessionResult({
      sessionId: session,
      branchId: branch,
      masterRows,
      countRows
    });
    if (!result.length) throw new Error('ไม่พบรายการสินค้าใน INVENTORY_MASTER');

    const response = await appendValues(`${SHEETS.result}!A:F`, result);
    const updatedRows = Number(response.data?.updates?.updatedRows || 0);
    const updatedRange = response.data?.updates?.updatedRange || '';
    if (!updatedRange || updatedRows !== result.length) {
      const error = new Error('Google Sheets ไม่ยืนยันการบันทึก SESSION_RESULT ครบถ้วน กรุณาตรวจสอบก่อนปิดซ้ำ');
      error.status = 502;
      error.saved = updatedRows;
      error.expected = result.length;
      throw error;
    }
    return { branch_id: branch, result, saved: updatedRows, updated_range: updatedRange };
  });
}

module.exports = {
  createSession,
  getMovementForBranch,
  saveCountItems,
  getSessionItems,
  closeSession
};
