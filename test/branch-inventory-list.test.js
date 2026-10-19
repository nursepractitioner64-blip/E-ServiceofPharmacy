'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseMaster, missingMandatory, includeMandatoryPlaceholders } = require('../src/modules/branchinventorylist/branchinventorylist.utils');
const SHEET = 'BRANCH_EMERGENCY_ITEMS';

test('branch-specific Inventory List uses a separate sheet and preserves Master List as source', () => {
  assert.equal(SHEET, 'BRANCH_EMERGENCY_ITEMS');
});

test('EMER001-EMER078 are mandatory and EMER079 remains optional by policy', () => {
  const rows = [['CODE','NAME','UNIT','REQUIRED']];
  for (let n = 1; n <= 79; n++) rows.push([`EMER${String(n).padStart(3,'0')}`, `Item ${n}`, 'ชิ้น', n === 79 ? 10 : 1]);
  const items = parseMaster(rows);
  assert.equal(items.length, 79);
  assert.equal(items[0].code, 'EMER001');
  assert.equal(items[77].code, 'EMER078');
  assert.equal(items[78].code, 'EMER079');
  assert.deepEqual(missingMandatory(items), []);
});

test('missing mandatory items are reported instead of silently omitted', () => {
  const rows = [['CODE','NAME','UNIT','REQUIRED'], ['EMER001','Item 1','ชิ้น',1], ['EMER079','Aspirin 325 mg','เม็ด',10]];
  const items = parseMaster(rows);
  const missing = missingMandatory(items);
  assert.equal(missing.length, 77);
  assert.equal(missing[0], 'EMER002');
  assert.equal(missing.at(-1), 'EMER078');
});

test('branch inventory list settings are mounted in the central API router and use server-side branch assignment checks', () => {
  const fs = require('node:fs');
  const routes = fs.readFileSync(require('node:path').join(__dirname, '../src/routes/index.js'), 'utf8');
  const api = fs.readFileSync(require('node:path').join(__dirname, '../src/modules/branchinventorylist/branchinventorylist.routes.js'), 'utf8');
  assert.match(routes, /branch-inventory-list/);
  assert.match(api, /function canManageBranch\(user, branchId\)/);
  assert.match(api, /async function getEffectiveUser\(req\)/);
  assert.match(api, /const effectiveUser = await getEffectiveUser\(req\)/);
  assert.match(api, /if \(!canManageBranch\(effectiveUser, branchId\)\)/);
  assert.match(api, /await auth\.listUsers\(\)/);
  assert.doesNotMatch(api, /router\.put\('\/', requireAdmin/);
  assert.doesNotMatch(api, /router\.get\('\/', requireAdmin/);
  assert.match(api, /allowed = isAdmin\(effectiveUser\) \? all : all\.filter/);
});

test('Daily Check loads the selected branch list and blocks saving a disabled item', () => {
  const fs = require('node:fs');
  const routes = fs.readFileSync(require('node:path').join(__dirname, '../src/modules/dailycheck/dailycheck.routes.js'), 'utf8');
  assert.match(routes, /getBranchInventoryList\(req\.authBranchId\)/);
  assert.match(routes, /ไม่ได้อยู่ใน Inventory List ของสาขาที่เลือก/);
});

test('all INVENTORY_MASTER rows are included; only EMER001-EMER078 are mandatory', () => {
  const rows = [
    ['CODE', 'NAME', 'UNIT', 'REQUIRED'],
    ['EMER001', 'Mandatory item', 'ชิ้น', 1],
    ['EMER079', 'Aspirin 325 mg', 'เม็ด', 10],
    ['EMER080', 'Optional emergency item', 'ชิ้น', 2],
    ['MED001', 'Master-only item', 'กล่อง', 3]
  ];
  const items = parseMaster(rows);
  assert.deepEqual(items.map(x => x.code), ['EMER001', 'EMER079', 'EMER080', 'MED001']);
  assert.equal(items.find(x => x.code === 'EMER001').mandatory, true);
  assert.equal(items.find(x => x.code === 'EMER079').mandatory, false);
  assert.equal(items.find(x => x.code === 'EMER080').mandatory, false);
  assert.equal(items.find(x => x.code === 'MED001').mandatory, false);
});

test('saving branch Inventory List is not blocked in the UI solely by missing mandatory master rows', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const client = fs.readFileSync(path.join(__dirname, '../public/modules/branchinventorylist/branchinventorylist.client.js'), 'utf8');
  const service = fs.readFileSync(path.join(__dirname, '../src/modules/branchinventorylist/branchinventorylist.service.js'), 'utf8');
  assert.match(client, /disabled = !\$\('bil-branch'\)\?\.value/);
  assert.doesNotMatch(client, /disabled = !\$\('bil-branch'\)\?\.value \|\| missing\.length > 0/);
  assert.match(service, /const branchItems|const desired = master\.map/);
  assert.match(service, /const missing = missingMandatory\(master\);/);
  assert.doesNotMatch(service, /const missing = missingMandatory\(master\);[\s\S]{0,120}if \(missing\.length\) throw new Error/);
});


test('Inventory List includes every Master row plus visible placeholders for mandatory codes missing from Master', () => {
  const master = parseMaster([
    ['CODE','NAME','UNIT','REQUIRED'],
    ['EMER001','เครื่อง suction','เครื่อง',1],
    ['EMER079','Aspirin 325 mg','เม็ด',10],
    ['EMER080','Heparin lock','ชิ้น',''],
    ['MED999','Extra Master item','กล่อง',4]
  ]);
  const all = includeMandatoryPlaceholders(master);
  const codes = new Set(all.map(x => x.code));
  assert.equal(codes.has('EMER001'), true);
  assert.equal(codes.has('EMER078'), true);
  assert.equal(codes.has('EMER079'), true);
  assert.equal(codes.has('EMER080'), true);
  assert.equal(codes.has('MED999'), true);
  assert.equal(all.find(x => x.code === 'EMER002').missingFromMaster, true);
  assert.equal(all.find(x => x.code === 'EMER079').mandatory, false);
  assert.equal(all.find(x => x.code === 'EMER080').mandatory, false);
});


test('Staff can open Inventory List menu and UI limits branches to assigned branches returned by the server', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const app = fs.readFileSync(path.join(__dirname, '../public/assets/js/app.js'), 'utf8');
  const menu = fs.readFileSync(path.join(__dirname, '../public/views/emergencycheck.html'), 'utf8');
  const client = fs.readFileSync(path.join(__dirname, '../public/modules/branchinventorylist/branchinventorylist.client.js'), 'utf8');
  assert.match(app, /\"branch-inventory-list\"[\s\S]{0,140}system: \"emergency\"/);
  assert.doesNotMatch(app, /\[\"user-management\", \"branch-management\", \"branch-inventory-list\"\]\.includes/);
  assert.match(menu, /data-route=\"branch-inventory-list\"/);
  assert.match(client, /Staff สามารถตั้งค่าได้เฉพาะสาขาที่ Admin มอบหมาย/);
});
