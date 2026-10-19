const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const client = fs.readFileSync(path.join(root, 'public/assets/js/auth.client.js'), 'utf8');
const routes = fs.readFileSync(path.join(root, 'src/modules/branches/branches.routes.js'), 'utf8');

test('Admin legacy ALL selection recovers to an authorized real branch', () => {
  assert.match(client, /savedBranchId = saved && saved !== 'ALL' \? saved : ''/);
  assert.match(client, /if \(user\?\.role === 'ADMIN' && !chosen && branches\.length\) chosen = branches\[0\]/);
  assert.match(client, /if \(chosen && initial\)/);
});

test('branch switch UI only offers actual branches, not unsupported ALL context', () => {
  assert.doesNotMatch(client, /data-branch-id="ALL"/);
  assert.doesNotMatch(client, /rememberedId === 'ALL'/);
  assert.match(routes, /branchId\.toUpperCase\(\) === 'ALL'/);
  assert.match(routes, /กรุณาเลือกสาขาที่ต้องการดูข้อมูล/);
});
