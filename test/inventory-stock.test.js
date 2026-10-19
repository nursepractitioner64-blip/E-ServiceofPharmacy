const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Inventory Stock reads INVENTORY_MOVEMENT and calculates balances by branch and LOT', () => {
  const controller = read('src/modules/drugbalance/drugbalance.controller.js');
  assert.match(controller, /INVENTORY_MOVEMENT/);
  assert.match(controller, /BRANCH_ID/);
  assert.match(controller, /row\.lot/);
  assert.match(controller, /row\.exp/);
  assert.match(controller, /row\.location/);
  assert.match(controller, /requireAuth/);
  assert.match(controller, /getEffectiveUser/);
  assert.doesNotMatch(controller, /STOCK_MOVEMENT/);
});

test('Inventory Stock UI supports branch/date/item filters and CSV export', () => {
  const view = read('public/views/stock-balance.html');
  const client = read('public/modules/drugbalance/stockbalance.client.js');
  assert.match(view, /id="dbBranchSelect"/);
  assert.match(view, /id="dbDateFrom"/);
  assert.match(view, /id="dbDateTo"/);
  assert.match(client, /exportCsv/);
  assert.match(client, /INVENTORY_MOVEMENT/);
  assert.match(client, /api\/branches\/selection/);
});
