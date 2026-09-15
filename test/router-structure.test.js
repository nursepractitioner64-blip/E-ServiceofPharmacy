const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const appJs = fs.readFileSync(path.join(root, 'public/assets/js/app.js'), 'utf8');
const emergencyJs = fs.readFileSync(path.join(root, 'public/modules/emergencycheck/emergencycheck.client.js'), 'utf8');
const controlledJs = fs.readFileSync(path.join(root, 'public/modules/controlleddrug/controlleddrug.client.js'), 'utf8');
const emergencyHtml = fs.readFileSync(path.join(root, 'public/views/emergencycheck.html'), 'utf8');
const controlledHtml = fs.readFileSync(path.join(root, 'public/views/controlleddrug.html'), 'utf8');

test('module menus use central data-route navigation', () => {
  assert.doesNotMatch(emergencyJs, /ems-check-menu-btn/);
  assert.doesNotMatch(controlledJs, /ems-check-menu-btn/);
  assert.doesNotMatch(emergencyJs, /window\.navigate/);
  assert.doesNotMatch(controlledJs, /window\.navigate/);
  assert.match(emergencyHtml, /data-route="inventory-master"/);
  assert.match(emergencyHtml, /data-route="receive-stock"/);
  assert.match(emergencyHtml, /data-route="inventorydispense"/);
  assert.match(controlledHtml, /data-route="receivedrug"/);
  assert.match(controlledHtml, /data-route="dispense"/);
  assert.match(controlledHtml, /data-route="stockout"/);
});

test('central router owns data-route and data-page handlers only once', () => {
  assert.equal((appJs.match(/document\.addEventListener\(\s*"click"/g) || []).length, 1);
  assert.match(appJs, /\[data-route\], \[data-page\]/);
  assert.doesNotMatch(appJs, /function bindEvents\(/);
});

test('backend API router centralizes existing module routes', () => {
  const apiRoutes = fs.readFileSync(path.join(root, 'src/routes/index.js'), 'utf8');
  const serverJs = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

  for (const route of [
    'inventorymaster/inventorymaster.routes',
    'receivestock/receivestock.routes',
    'dispense/dispense.routes',
    'receivedrug/receivedrug.routes',
    'dailycheck/dailycheck.routes',
    'dashboard/summarydrug/sumdrugstock.routes',
    'drugbalance/drugbalance.routes'
  ]) {
    assert.match(apiRoutes, new RegExp(route.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')));
  }

  assert.match(serverJs, /app\.use\(\s*"\/api",\s*apiRoutes\s*\)/);
  assert.doesNotMatch(serverJs, /app\.use\(\s*"\/api\/dispense"[\s\S]*?dispenseRoutes/);
  assert.doesNotMatch(serverJs, /app\.use\(\s*"\/api\/receivedrug"[\s\S]*?receivedrug\.routes/);
  assert.doesNotMatch(serverJs, /app\.use\(\s*"\/api\/receivestock"[\s\S]*?receivestock\.routes/);
});

test('there is only one active SPA router implementation', () => {
  assert.equal(fs.existsSync(path.join(root, 'public/assets/js/app.js')), true);
  assert.equal(fs.existsSync(path.join(root, 'public/assets/js/core/router.js')), false);
  assert.equal(fs.existsSync(path.join(root, 'public/modules/emergencycheck/emergencycheck.view.js')), false);
});
