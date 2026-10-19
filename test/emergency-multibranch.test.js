const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('Emergency Checklist uses BRANCH as the only location master and does not expose cart APIs', () => {
  const routes = read('src/modules/emergencycheck/emergencycheck.routes.js');
  const index = read('src/routes/index.js');
  assert.match(routes, /router\.get\("\/branches"/);
  assert.match(routes, /router\.post\("\/branches"/);
  assert.match(routes, /router\.get\("\/branch-items"/);
  assert.match(routes, /router\.post\("\/branch-items"/);
  assert.doesNotMatch(routes, /router\.(?:get|post)\("\/(?:carts|cart-items)"/);
  assert.match(routes, /BRANCH_EMERGENCY_ITEM/);
  assert.match(routes, /CHECK_SESSION/);
  assert.match(routes, /CHECK_DETAIL/);
  assert.match(index, /"\/emergencycheck"[\s\S]*?emergencycheck\.routes/);
});

test('Emergency Checklist UI selects a branch and configures items per branch without cart controls', () => {
  const view = read('public/views/emergencycheck.html');
  const client = read('public/modules/emergencycheck/emergencycheck.client.js');
  assert.match(view, /id="emergencyBranchSelect"/);
  assert.doesNotMatch(view, /emergencyCartSelect|emergencyCreateCartForm|emergencyCartCode/);
  assert.match(view, /emergencyCreateBranchForm/);
  assert.match(view, /emergencyAssignItemForm/);
  assert.match(client, /\/api\/emergencycheck\/branches/);
  assert.match(client, /\/api\/emergencycheck\/branch-items/);
  assert.doesNotMatch(client, /\/api\/emergencycheck\/(?:carts|cart-items)/);
});

test('Daily Check scopes the item list and history by branch without requiring a cart', () => {
  const routes = read('src/modules/dailycheck/dailycheck.routes.js');
  const client = read('public/modules/dailycheck/dailycheck.client.js');
  assert.match(routes, /req\.query\.branchId/);
  assert.match(routes, /BRANCH_EMERGENCY_ITEM/);
  assert.match(routes, /row\[7\].*branchId/);
  assert.doesNotMatch(routes, /EMERGENCY_CART_ITEM|EMERGENCY_CART!|cleanCartId/);
  assert.match(client, /params\.set\("branchId", branchId\)/);
  assert.doesNotMatch(client, /emergencyCartSelect|params\.set\("cartId"/);
});
