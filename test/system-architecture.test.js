const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('server mounts the central API router exactly once', () => {
  const server = read('server.js');
  const matches = server.match(/require\(["']\.\/src\/routes\/index["']\)/g) || [];
  assert.equal(matches.length, 1);
  assert.match(server, /app\.use\(\s*["']\/api["']\s*,\s*apiRoutes\s*\)/);
});

test('central API router owns both Emergency and Controlled system API namespaces', () => {
  const routes = read('src/routes/index.js');
  assert.match(routes, /\/inventory-master/);
  assert.match(routes, /\/receive-stock/);
  assert.match(routes, /\/dispense/);
  assert.match(routes, /\/receivedrug/);
  assert.match(routes, /\/dailycheck/);
});

test('Emergency and Controlled screen modules do not own SPA menu navigation', () => {
  const emergency = read('public/modules/emergencycheck/emergencycheck.client.js');
  const controlled = read('public/modules/controlleddrug/controlleddrug.client.js');
  assert.doesNotMatch(emergency, /ems-check-menu-btn[\s\S]*addEventListener/);
  assert.doesNotMatch(controlled, /ems-check-menu-btn[\s\S]*addEventListener/);
});

test('Controlled Drug menu labels match their destination routes', () => {
  const view = read('public/views/controlleddrug.html');
  assert.match(view, /data-route="dailycheck"[\s\S]*?Daily Check/);
  assert.match(view, /data-route="stockout"[\s\S]*?Drug Balance/);
});

test('system entry screens provide explicit switching between the two systems', () => {
  const emergency = read('public/views/emergencycheck.html');
  const controlled = read('public/views/controlleddrug.html');
  assert.match(emergency, /data-route="controlled-drug"/);
  assert.match(controlled, /data-route="emergency-checklist"/);
});

test('system entry clients load live dashboard data instead of placeholder values', () => {
  const emergency = read('public/modules/emergencycheck/emergencycheck.client.js');
  const controlled = read('public/modules/controlleddrug/controlleddrug.client.js');

  for (const source of [emergency, controlled]) {
    assert.match(source, /\/api\/dashboard\/system/);
    assert.doesNotMatch(source, /fakeDelay\(/);
    assert.doesNotMatch(source, /total:\s*124/);
    assert.doesNotMatch(source, /ready:\s*118/);
  }
});


test('controlled dashboard repository falls back to DRUG_RECEIVE when DRUG_MASTER is empty', () => {
  const repo = read('src/modules/dashboard/summarydrug/sumdrugstock.repository.js');
  assert.match(repo, /readSheet\('DRUG_RECEIVE'/);
  assert.match(repo, /controlledMaster\.length\s*>\s*1/);
  assert.match(repo, /controlledReceive\.slice\(1\)/);
});
