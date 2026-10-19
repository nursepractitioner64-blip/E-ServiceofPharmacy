const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

test('branch selector is shown after authentication and remembers per-user branch', () => {
  const client = fs.readFileSync(path.join(root, 'public/assets/js/auth.client.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  assert.match(client, /esp:last-branch:/);
  assert.match(client, /\/api\/branches\/selection/);
  assert.match(client, /branches\.length === 1/);
  assert.match(client, /auth-switch-branch-button/);
  assert.match(html, /id="branch-select-screen"/);
  assert.match(html, /id="auth-current-branch"/);
});

test('server validates branch selection and blocks writes without an active authorized branch', () => {
  const routes = fs.readFileSync(path.join(root, 'src/modules/branches/branches.routes.js'), 'utf8');
  const middleware = fs.readFileSync(path.join(root, 'src/modules/auth/auth.middleware.js'), 'utf8');
  assert.match(routes, /router\.post\('\/selection', requireAuth/);
  assert.match(routes, /async function effectiveUser\(req\)/);
  assert.match(routes, /const user = await effectiveUser\(req\)/);
  assert.match(routes, /user\.branchIds \|\| \[\]\)\.some/);
  assert.match(middleware, /BRANCH_REQUIRED/);
  assert.match(middleware, /BRANCH_FORBIDDEN/);
  assert.match(middleware, /BRANCH_INACTIVE/);
});

test('new Daily Check and Emergency Checklist records carry BRANCH_ID without rewriting history', () => {
  const daily = fs.readFileSync(path.join(root, 'src/modules/dailycheck/dailycheck.routes.js'), 'utf8');
  const emergency = fs.readFileSync(path.join(root, 'src/modules/emergencycheck/emergencycheck.routes.js'), 'utf8');
  assert.match(daily, /router\.post\([\s\S]*?"\/check",\s*requireBranch/);
  assert.match(daily, /COUNT_SESSION!H1/);
  assert.match(daily, /req\.authBranchId/);
  assert.match(emergency, /router\.post\("\/check", requireBranch/);
  assert.match(emergency, /"BRANCH_ID"/);
  assert.match(emergency, /req\.authBranchId/);
});

test('branch edit form allows changing the branch ID and submits it to the API', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const root = path.resolve(__dirname, '..');
  const client = fs.readFileSync(path.join(root, 'public/modules/branches/branches.client.js'), 'utf8');
  const view = fs.readFileSync(path.join(root, 'public/views/branchmanagement.html'), 'utf8');
  assert.match(client, /branchId:\$\('branch-id-code'\)\.value\.trim\(\)/);
  assert.match(client, /data-edit=.*data-name=/);
  assert.match(view, /รหัสสาขา \(Admin แก้ไขได้\)/);
});
