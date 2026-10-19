const { getSheets, getSpreadsheetId } = require('../../config/google');

// BRANCH is the canonical master because it already exists in the user's workbook.
// BRANCHES is treated as a legacy source and is copied into BRANCH once per process.
const SHEET = 'BRANCH';
const LEGACY_SHEET = 'BRANCHES';
const HEADERS = ['BRANCH_ID', 'BRANCH_CODE', 'BRANCH_NAME', 'STATUS', 'CREATED_AT', 'UPDATED_AT', 'REMARK'];
let initPromise = null;
let mutationQueue = Promise.resolve();

const clean = value => String(value ?? '').trim();
const norm = value => clean(value).replace(/^\uFEFF/, '').replace(/\s+/g, ' ').toLocaleLowerCase('th');
const now = () => new Date().toISOString();
function columnLetter(number) {
  let out = '';
  while (number > 0) {
    const rem = (number - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    number = Math.floor((number - 1) / 26);
  }
  return out;
}
function parseRows(values) {
  if (!values?.length) return [];
  const headers = values[0].map(value => clean(value).replace(/^\uFEFF/, '').toUpperCase());
  return values.slice(1).map((row, index) => {
    const item = {};
    headers.forEach((header, i) => { if (header) item[header] = row[i] ?? ''; });
    item.__rowNumber = index + 2;
    return item;
  }).filter(item => Object.keys(item).length > 1);
}
function rowValues(branch, headers) {
  const values = {
    BRANCH_ID: branch.BRANCH_ID || '',
    BRANCH_CODE: branch.BRANCH_CODE || '',
    BRANCH_NAME: branch.BRANCH_NAME || '',
    STATUS: clean(branch.STATUS).toUpperCase() || 'ACTIVE',
    CREATED_AT: branch.CREATED_AT || now(),
    UPDATED_AT: branch.UPDATED_AT || branch.CREATED_AT || now(),
    REMARK: branch.REMARK || ''
  };
  return headers.map(header => values[header] ?? branch[header] ?? '');
}
async function getTitles(sheets) {
  const result = await sheets.spreadsheets.get({
    spreadsheetId: getSpreadsheetId(),
    fields: 'sheets(properties(title))'
  });
  return (result.data.sheets || []).map(sheet => sheet.properties?.title).filter(Boolean);
}
function quoteSheet(title) { return `'${String(title).replace(/'/g, "''")}'`; }
async function readSheet(sheets, title) {
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: `${quoteSheet(title)}!A:Z`
  });
  return result.data.values || [];
}
async function cleanupExactDuplicateIds(sheets) {
  const rows = await readSheet(sheets, SHEET);
  const parsed = parseRows(rows);
  const groups = new Map();
  for (const row of parsed) {
    const id = clean(row.BRANCH_ID);
    if (!id) continue;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(row);
  }
  const deleteRows = [];
  for (const [id, group] of groups) {
    if (group.length < 2) continue;
    const fingerprint = row => [
      clean(row.BRANCH_CODE), norm(row.BRANCH_NAME),
      clean(row.STATUS).toUpperCase() || 'ACTIVE', clean(row.REMARK)
    ].join('|');
    const fingerprints = new Set(group.map(fingerprint));
    if (fingerprints.size !== 1) {
      console.warn(`BRANCH DUPLICATE CONFLICT: ${id} มีหลายแถวแต่ข้อมูลไม่ตรงกัน จึงไม่ลบอัตโนมัติ`);
      continue;
    }
    // Same ID and same branch attributes: keep the row with the latest UPDATED_AT.
    const sorted = [...group].sort((a, b) => clean(b.UPDATED_AT).localeCompare(clean(a.UPDATED_AT)));
    const keep = sorted[0];
    for (const row of group) if (row.__rowNumber !== keep.__rowNumber) deleteRows.push(row.__rowNumber);
  }
  if (!deleteRows.length) return;
  const requests = deleteRows.sort((a, b) => b - a).map(rowNumber => ({
    deleteDimension: {
      range: {
        sheetId: null,
        dimension: 'ROWS',
        startIndex: rowNumber - 1,
        endIndex: rowNumber
      }
    }
  }));
  // Resolve the actual sheetId before deleting duplicate master rows.
  const book = await sheets.spreadsheets.get({
    spreadsheetId: getSpreadsheetId(),
    fields: 'sheets(properties(sheetId,title))'
  });
  const sheetId = (book.data.sheets || []).find(s => s.properties?.title === SHEET)?.properties?.sheetId;
  if (sheetId === undefined) return;
  for (const request of requests) request.deleteDimension.range.sheetId = sheetId;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: getSpreadsheetId(),
    requestBody: { requests }
  });
  console.log(`BRANCH CLEANUP: ลบแถวซ้ำที่มี BRANCH_ID และข้อมูลสาขาเหมือนกัน ${deleteRows.length} แถวใน ${SHEET}`);
}

async function ensureSheet() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const sheets = await getSheets();
    let titles = await getTitles(sheets);
    if (!titles.includes(SHEET)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: getSpreadsheetId(),
        requestBody: { requests: [{ addSheet: { properties: { title: SHEET } } }] }
      });
      titles = [...titles, SHEET];
    }

    let rows = await readSheet(sheets, SHEET);
    if (!rows.length || !(rows[0] || []).some(value => clean(value))) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: getSpreadsheetId(), range: `${SHEET}!A1:G1`,
        valueInputOption: 'RAW', requestBody: { values: [HEADERS] }
      });
      rows = [HEADERS];
    }

    let headers = rows[0].map(value => clean(value).replace(/^\uFEFF/, '').toUpperCase());
    // Preserve existing columns and append only missing canonical columns.
    for (const header of HEADERS) {
      if (!headers.includes(header)) {
        const col = columnLetter(headers.length + 1);
        await sheets.spreadsheets.values.update({
          spreadsheetId: getSpreadsheetId(), range: `${SHEET}!${col}1`,
          valueInputOption: 'RAW', requestBody: { values: [[header]] }
        });
        headers.push(header);
      }
    }

    // Migrate the previously used BRANCHES master into BRANCH without deleting the
    // legacy sheet. IDs already present in BRANCH are retained and never replaced.
    if (titles.includes(LEGACY_SHEET)) {
      const canonical = parseRows(await readSheet(sheets, SHEET));
      const seenIds = new Set(canonical.map(branch => clean(branch.BRANCH_ID)).filter(Boolean));
      const legacy = parseRows(await readSheet(sheets, LEGACY_SHEET));
      const toMigrate = [];
      for (const old of legacy) {
        const id = clean(old.BRANCH_ID);
        const name = clean(old.BRANCH_NAME);
        if (!id || name.length < 2) continue;
        if (seenIds.has(id)) continue;
        // Preserve distinct IDs even if names match: user assignments may refer
        // to an older ID, so never silently remap or discard a branch identity.
        const mapped = {
          BRANCH_ID: id,
          BRANCH_CODE: clean(old.BRANCH_CODE),
          BRANCH_NAME: name,
          STATUS: clean(old.STATUS).toUpperCase() || 'ACTIVE',
          CREATED_AT: clean(old.CREATED_AT) || now(),
          UPDATED_AT: clean(old.UPDATED_AT) || clean(old.CREATED_AT) || now(),
          REMARK: clean(old.REMARK)
        };
        toMigrate.push(mapped);
        seenIds.add(id);
      }
      if (toMigrate.length) {
        const current = await readSheet(sheets, SHEET);
        const actualHeaders = (current[0] || HEADERS).map(value => clean(value).replace(/^\uFEFF/, '').toUpperCase());
        await sheets.spreadsheets.values.append({
          spreadsheetId: getSpreadsheetId(), range: `${SHEET}!A:Z`,
          valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS',
          requestBody: { values: toMigrate.map(branch => rowValues(branch, actualHeaders)) }
        });
        console.log(`BRANCH MIGRATION: ย้ายข้อมูล ${toMigrate.length} สาขาจาก ${LEGACY_SHEET} ไป ${SHEET}; คงชีตเดิมไว้`);
      }
    }
    await cleanupExactDuplicateIds(sheets);
    return sheets;
  })().catch(error => { initPromise = null; throw error; });
  return initPromise;
}
async function listBranches({ includeInactive = true } = {}) {
  const sheets = await ensureSheet();
  const rows = await readSheet(sheets, SHEET);
  const parsed = parseRows(rows);
  const seen = new Set();
  const result = [];
  for (const item of parsed) {
    item.BRANCH_ID = clean(item.BRANCH_ID);
    item.BRANCH_CODE = clean(item.BRANCH_CODE);
    item.BRANCH_NAME = clean(item.BRANCH_NAME);
    item.STATUS = clean(item.STATUS).toUpperCase() || 'ACTIVE';
    if (!item.BRANCH_ID || !item.BRANCH_NAME) continue;
    if (seen.has(item.BRANCH_ID)) {
      console.warn(`BRANCH DUPLICATE ID: พบ ${item.BRANCH_ID} ซ้ำในชีต ${SHEET}; API จะแสดงรายการที่อัปเดตล่าสุด`);
      const previousIndex = result.findIndex(branch => branch.BRANCH_ID === item.BRANCH_ID);
      if (previousIndex >= 0 && clean(item.UPDATED_AT).localeCompare(clean(result[previousIndex].UPDATED_AT)) > 0) {
        result[previousIndex] = item;
      }
      continue;
    }
    seen.add(item.BRANCH_ID);
    result.push(item);
  }
  return includeInactive ? result : result.filter(branch => branch.STATUS === 'ACTIVE');
}
function withMutationLock(task) {
  const current = mutationQueue.then(task, task);
  mutationQueue = current.catch(() => {});
  return current;
}
async function createBranch(input, actor) {
  return withMutationLock(async () => {
    const id = clean(input.branchId || input.BRANCH_ID);
    const name = clean(input.name || input.BRANCH_NAME);
    const code = clean(input.code || input.branchCode || input.BRANCH_CODE);
    const remark = clean(input.remark || input.REMARK);
    if (!id) throw new Error('กรุณากำหนดรหัสสาขา');
    if (id.length > 60) throw new Error('รหัสสาขาต้องไม่เกิน 60 ตัวอักษร');
    if (/[\r\n\t]/.test(id)) throw new Error('รหัสสาขามีรูปแบบไม่ถูกต้อง');
    if (name.length < 2 || name.length > 120) throw new Error('ชื่อสาขาต้องมี 2–120 ตัวอักษร');
    if (code.length > 40) throw new Error('รหัสอ้างอิงสาขาต้องไม่เกิน 40 ตัวอักษร');
    const branches = await listBranches();
    if (branches.some(branch => clean(branch.BRANCH_ID).toLowerCase() === id.toLowerCase())) throw new Error('รหัสสาขานี้มีอยู่แล้ว');
    if (branches.some(branch => norm(branch.BRANCH_NAME) === norm(name))) throw new Error('มีชื่อสาขานี้อยู่แล้ว');
    if (code && branches.some(branch => clean(branch.BRANCH_CODE).toLowerCase() === code.toLowerCase())) throw new Error('รหัสสาขานี้มีอยู่แล้ว');
    const stamp = now();
    const branch = { BRANCH_ID: id, BRANCH_CODE: code, BRANCH_NAME: name, STATUS: 'ACTIVE', CREATED_AT: stamp, UPDATED_AT: stamp, REMARK: remark };
    const sheets = await ensureSheet();
    const rows = await readSheet(sheets, SHEET);
    const headers = (rows[0] || HEADERS).map(value => clean(value).replace(/^\uFEFF/, '').toUpperCase());
    await sheets.spreadsheets.values.append({
      spreadsheetId: getSpreadsheetId(), range: `${SHEET}!A:Z`,
      valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [rowValues(branch, headers)] }
    });
    return { branchId: id, branchCode: code, name, status: 'ACTIVE', createdAt: stamp, createdBy: actor?.userId || '' };
  });
}
async function collectBranchReferenceUpdates(sheets, oldId, newId) {
  const titles = await getTitles(sheets);
  const requests = [];
  if (!oldId || !newId || oldId === newId) return requests;
  for (const title of titles) {
    if (title === SHEET || title === LEGACY_SHEET || /vaccine|vaccination|immuniz/i.test(title)) continue;
    let values;
    try { values = await readSheet(sheets, title); }
    catch (err) { console.warn(`BRANCH REF READ SKIPPED: ${title}: ${err.message}`); continue; }
    if (!values.length) continue;
    const headers = values[0].map(value => clean(value).replace(/^\uFEFF/, '').toUpperCase());
    const branchCol = headers.indexOf('BRANCH_ID');
    const userBranchCol = headers.indexOf('BRANCH_IDS');
    for (let i = 1; i < values.length; i++) {
      const row = values[i] || [];
      const rowNumber = i + 1;
      if (branchCol >= 0 && clean(row[branchCol]) === oldId) {
        requests.push({ range: `${quoteSheet(title)}!${columnLetter(branchCol + 1)}${rowNumber}`, values: [[newId]] });
      }
      if (userBranchCol >= 0) {
        const raw = clean(row[userBranchCol]);
        let ids = raw.split(',').map(x => x.trim());
        // Also support JSON arrays in case BRANCH_IDS was stored that way.
        if (raw.startsWith('[')) {
          try { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) ids = parsed.map(x => String(x).trim()); } catch (_) {}
        }
        if (ids.includes(oldId)) {
          const updated = ids.map(id => id === oldId ? newId : id);
          const output = raw.startsWith('[') ? JSON.stringify(updated) : updated.join(',');
          requests.push({ range: `${quoteSheet(title)}!${columnLetter(userBranchCol + 1)}${rowNumber}`, values: [[output]] });
        }
      }
    }
  }
  // Keep the legacy master aligned so the startup migration does not re-add old IDs.
  if (titles.includes(LEGACY_SHEET)) {
    const values = await readSheet(sheets, LEGACY_SHEET);
    const headers = (values[0] || []).map(value => clean(value).replace(/^\uFEFF/, '').toUpperCase());
    const col = headers.indexOf('BRANCH_ID');
    if (col >= 0) for (let i = 1; i < values.length; i++) if (clean((values[i] || [])[col]) === oldId) {
      requests.push({ range: `${quoteSheet(LEGACY_SHEET)}!${columnLetter(col + 1)}${i + 1}`, values: [[newId]] });
    }
  }
  return requests;
}

async function updateBranch(branchId, input) {
  return withMutationLock(async () => {
    const branches = await listBranches();
    const branch = branches.find(item => item.BRANCH_ID === branchId);
    if (!branch) return false;
    const requestedId = input.branchId === undefined && input.BRANCH_ID === undefined
      ? branch.BRANCH_ID : clean(input.branchId ?? input.BRANCH_ID);
    if (!requestedId) throw new Error('กรุณาระบุรหัสสาขา');
    if (requestedId.length > 60 || /[\r\n\t]/.test(requestedId)) throw new Error('รหัสสาขามีรูปแบบไม่ถูกต้อง');
    if (branches.some(item => item.BRANCH_ID !== branchId && clean(item.BRANCH_ID).toLowerCase() === requestedId.toLowerCase())) throw new Error('รหัสสาขานี้มีอยู่แล้ว');
    const name = input.name === undefined ? branch.BRANCH_NAME : clean(input.name);
    const code = input.code === undefined && input.BRANCH_CODE === undefined
      ? branch.BRANCH_CODE : clean(input.code ?? input.BRANCH_CODE);
    const status = input.status === undefined ? branch.STATUS : clean(input.status).toUpperCase();
    const remark = input.remark === undefined && input.REMARK === undefined
      ? branch.REMARK : clean(input.remark ?? input.REMARK);
    if (name.length < 2 || name.length > 120) throw new Error('ชื่อสาขาต้องมี 2–120 ตัวอักษร');
    if (code.length > 40) throw new Error('รหัสสาขาต้องไม่เกิน 40 ตัวอักษร');
    if (!['ACTIVE', 'INACTIVE'].includes(status)) throw new Error('สถานะสาขาไม่ถูกต้อง');
    if (branches.some(item => item.BRANCH_ID !== branchId && norm(item.BRANCH_NAME) === norm(name))) throw new Error('มีชื่อสาขานี้อยู่แล้ว');
    if (code && branches.some(item => item.BRANCH_ID !== branchId && clean(item.BRANCH_CODE).toLowerCase() === code.toLowerCase())) throw new Error('รหัสสาขานี้มีอยู่แล้ว');
    const sheets = await ensureSheet();
    const headersResult = await readSheet(sheets, SHEET);
    const headers = (headersResult[0] || HEADERS).map(value => clean(value).replace(/^\uFEFF/, '').toUpperCase());
    const row = { ...branch, BRANCH_ID: requestedId, BRANCH_NAME: name, BRANCH_CODE: code, STATUS: status, UPDATED_AT: now(), REMARK: remark };
    const endCol = columnLetter(headers.length);
    const changes = [{
      range: `${quoteSheet(SHEET)}!A${branch.__rowNumber}:${endCol}${branch.__rowNumber}`,
      values: [rowValues(row, headers)]
    }];
    // Gather every known reference before writing. The branch master row and all
    // reference changes are sent in one values.batchUpdate call, avoiding the old
    // behavior where the branch row could be written but a later reference update
    // failed and made the UI appear as if nothing was saved.
    if (requestedId !== branchId) {
      const references = await collectBranchReferenceUpdates(sheets, branchId, requestedId);
      changes.push(...references);
    }
    console.log(`BRANCH UPDATE REQUEST: ${branchId} -> ${requestedId}; master row ${branch.__rowNumber}; ranges=${changes.length}`);
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: getSpreadsheetId(),
      requestBody: { valueInputOption: 'RAW', data: changes }
    });
    if (requestedId !== branchId) {
      try { require('../auth/auth.service').remapBranchId(branchId, requestedId); }
      catch (err) { console.warn('BRANCH SESSION REMAP WARNING:', err.message); }
    }
    console.log(`BRANCH UPDATE SUCCESS: ${branchId} -> ${requestedId}`);
    return true;
  });
}
module.exports = { ensureSheet, listBranches, createBranch, updateBranch };
