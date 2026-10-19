const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

const routes = fs.readFileSync(path.join(root, 'src/modules/dailycheck/dailycheck.routes.js'), 'utf8');

test('Daily Check GET requires a selected and authorized active branch', () => {
  assert.match(routes, /router\.get\("\/",\s*requireBranch,\s*async\s*\(req,\s*res\)\s*=>/);
});

test('Daily Check history filters COUNT_SESSION by the server-validated BRANCH_ID in column H', () => {
  assert.match(routes, /const currentBranchId = String\(req\.authBranchId \|\| ""\)\.trim\(\)/);
  assert.match(routes, /const rowBranchId = String\(row\[7\] \|\| ""\)\.trim\(\)/);
  assert.match(routes, /rowBranchId !== currentBranchId/);
  assert.match(routes, /branchId:\s*currentBranchId/);
});

test('Daily Check keeps historical rows without BRANCH_ID out of branch-specific totals and writes new rows with BRANCH_ID', () => {
  assert.match(routes, /รายการเก่าที่ไม่มี BRANCH_ID/);
  assert.match(routes, /const newRow = \[sessionId, movementId, item\.CODE, item\.NAME, qty, cleanUser, isoTime, req\.authBranchId\]/);
  assert.match(routes, /range:\s*"COUNT_SESSION!A:H"/);
});
