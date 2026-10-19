'use strict';

const { getSheets, getSpreadsheetId } = require('../../config/google');
const { parseMaster, missingMandatory, includeMandatoryPlaceholders } = require('./branchinventorylist.utils');
const SHEET = 'BRANCH_EMERGENCY_ITEMS';
const HEADERS = ['BRANCH_ID', 'CODE', 'ENABLED', 'REQUIRED', 'UPDATED_AT', 'UPDATED_BY'];
const clean = value => String(value ?? '').trim();
const normHeader = value => clean(value).replace(/^\uFEFF/, '').replace(/[\s_]+/g, '_').toUpperCase();
const quoteSheet = value => `'${String(value).replace(/'/g, "''")}'`;

async function getSheetTitles(sheets) {
  const response = await sheets.spreadsheets.get({ spreadsheetId: getSpreadsheetId(), fields: 'sheets(properties(title))' });
  return (response.data.sheets || []).map(x => x.properties?.title).filter(Boolean);
}

async function ensureConfigSheet() {
  const sheets = await getSheets();
  const titles = await getSheetTitles(sheets);
  if (!titles.includes(SHEET)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: getSpreadsheetId(),
      requestBody: { requests: [{ addSheet: { properties: { title: SHEET } } }] }
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: getSpreadsheetId(), range: `${quoteSheet(SHEET)}!A1:F1`, valueInputOption: 'RAW',
      requestBody: { values: [HEADERS] }
    });
    console.log(`BRANCH INVENTORY LIST: created sheet ${SHEET}`);
    return sheets;
  }
  const headerResult = await sheets.spreadsheets.values.get({ spreadsheetId: getSpreadsheetId(), range: `${quoteSheet(SHEET)}!A1:Z1` });
  const headers = (headerResult.data.values?.[0] || []).map(normHeader);
  if (!headers.length) {
    await sheets.spreadsheets.values.update({ spreadsheetId: getSpreadsheetId(), range: `${quoteSheet(SHEET)}!A1:F1`, valueInputOption: 'RAW', requestBody: { values: [HEADERS] } });
  } else {
    const missing = HEADERS.filter(x => !headers.includes(x));
    if (missing.length) throw new Error(`ชีต ${SHEET} มีหัวตารางไม่ครบ: ${missing.join(', ')}`);
    const actual = headers.slice(0, HEADERS.length);
    if (HEADERS.some((x, i) => actual[i] !== x)) throw new Error(`ชีต ${SHEET} ต้องเรียงคอลัมน์เป็น ${HEADERS.join(', ')}`);
  }
  return sheets;
}

async function readMaster(sheets) {
  const response = await sheets.spreadsheets.values.get({ spreadsheetId: getSpreadsheetId(), range: "'INVENTORY_MASTER'!A:Z" });
  return parseMaster(response.data.values || []);
}

async function readConfigRows(sheets) {
  const response = await sheets.spreadsheets.values.get({ spreadsheetId: getSpreadsheetId(), range: `${quoteSheet(SHEET)}!A:F` });
  return (response.data.values || []).slice(1).map((row, index) => ({
    rowNumber: index + 2,
    branchId: clean(row[0]), code: clean(row[1]).toUpperCase(),
    enabled: clean(row[2]).toUpperCase() === 'TRUE' || clean(row[2]) === '1' || clean(row[2]).toUpperCase() === 'YES',
    required: row[3] === undefined || row[3] === '' ? null : Number(row[3]),
    updatedAt: clean(row[4]), updatedBy: clean(row[5])
  })).filter(row => row.branchId && row.code);
}

async function getBranchInventoryList(branchId) {
  const cleanBranchId = clean(branchId);
  if (!cleanBranchId || cleanBranchId === 'ALL') throw new Error('กรุณาเลือกสาขาที่ปฏิบัติงาน');
  const sheets = await ensureConfigSheet();
  const [master, configs] = await Promise.all([readMaster(sheets), readConfigRows(sheets)]);
  const byCode = new Map();
  for (const row of configs) if (row.branchId === cleanBranchId) byCode.set(row.code, row);

  // Include every Inventory Master row plus visible placeholders for mandatory codes missing from Master.
  const combined = includeMandatoryPlaceholders(master);

  return combined.map(item => {
    const config = byCode.get(item.code);
    const mandatory = Boolean(item.mandatory);
    const enabled = mandatory ? true : Boolean(config?.enabled);
    const required = config && Number.isFinite(config.required) && config.required >= 0 ? config.required : item.masterRequired;
    return { ...item, required, enabled, mandatory, configured: Boolean(config) };
  });
}

async function saveBranchInventoryList(branchId, submittedItems, actor) {
  const cleanBranchId = clean(branchId);
  if (!cleanBranchId || cleanBranchId === 'ALL') throw new Error('กรุณาเลือกสาขาที่ถูกต้อง');
  const branchService = require('../branches/branches.service');
  const branches = await branchService.listBranches({ includeInactive: false });
  if (!branches.some(branch => clean(branch.BRANCH_ID) === cleanBranchId)) throw new Error('ไม่พบสาขาหรือสาขาปิดใช้งานแล้ว');

  const sheets = await ensureConfigSheet();
  const [master, existing] = await Promise.all([readMaster(sheets), readConfigRows(sheets)]);
  // Save settings for every item currently in INVENTORY_MASTER even if a mandatory
  // code is missing. Return the missing-code warning so optional settings (e.g. EMER079)
  // can still be saved; the UI continues to warn that the master list needs completion.
  const missing = missingMandatory(master);

  const submitted = new Map((Array.isArray(submittedItems) ? submittedItems : []).map(item => [clean(item.code).toUpperCase(), item]));
  const now = new Date().toISOString();
  const user = clean(actor?.fullName || actor?.username || 'ADMIN');
  const existingForBranch = new Map(existing.filter(row => row.branchId === cleanBranchId).map(row => [row.code, row]));
  const desired = master.map(item => {
    const mandatory = Boolean(item.mandatory);
    const request = submitted.get(item.code) || {};
    const previous = existingForBranch.get(item.code);
    const rawRequired = request.required === undefined || request.required === null || request.required === ''
      ? (previous && Number.isFinite(previous.required) && previous.required >= 0 ? previous.required : item.masterRequired)
      : Number(request.required);
    if (!Number.isInteger(rawRequired) || rawRequired < 0) throw new Error(`จำนวน REQUIRED ของ ${item.code} ต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป`);
    const enabled = mandatory || (typeof request.enabled === 'boolean' ? request.enabled : Boolean(previous?.enabled));
    return { branchId: cleanBranchId, code: item.code, enabled, required: rawRequired, updatedAt: now, updatedBy: user };
  });

  const existingByKey = new Map();
  for (const row of existing) {
    const key = `${row.branchId}::${row.code}`;
    if (!existingByKey.has(key)) existingByKey.set(key, []);
    existingByKey.get(key).push(row.rowNumber);
  }
  const updates = [];
  const append = [];
  for (const item of desired) {
    const key = `${item.branchId}::${item.code}`;
    const rows = existingByKey.get(key) || [];
    const values = [item.branchId, item.code, item.enabled ? 'TRUE' : 'FALSE', item.required, item.updatedAt, item.updatedBy];
    if (rows.length) {
      for (const rowNumber of rows) updates.push({ range: `${quoteSheet(SHEET)}!A${rowNumber}:F${rowNumber}`, values: [values] });
    } else append.push(values);
  }
  if (updates.length) await sheets.spreadsheets.values.batchUpdate({ spreadsheetId: getSpreadsheetId(), requestBody: { valueInputOption: 'RAW', data: updates } });
  if (append.length) await sheets.spreadsheets.values.append({ spreadsheetId: getSpreadsheetId(), range: `${quoteSheet(SHEET)}!A:F`, valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS', requestBody: { values: append } });
  console.log('BRANCH INVENTORY LIST SAVED:', { branchId: cleanBranchId, count: desired.length, enabled: desired.filter(x => x.enabled).length, missingMandatory: missing, user });
  return { branchId: cleanBranchId, saved: desired.length, enabled: desired.filter(x => x.enabled).length, missingMandatory: missing };
}

module.exports = { SHEET, getBranchInventoryList, saveBranchInventoryList, missingMandatory };
