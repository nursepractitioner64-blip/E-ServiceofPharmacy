const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const appJs = fs.readFileSync(path.join(root, 'public/assets/js/app.js'), 'utf8');
const controlledJs = fs.readFileSync(path.join(root, 'public/modules/controlleddrug/controlleddrug.client.js'), 'utf8');
const emergencyJs = fs.readFileSync(path.join(root, 'public/modules/emergencycheck/emergencycheck.client.js'), 'utf8');

test('SPA exposes both system routes', () => {
  assert.match(appJs, /"emergency-checklist"\s*:/);
  assert.match(appJs, /"controlled-drug"\s*:/);
});

test('module clients do not own SPA menu navigation', () => {
  assert.doesNotMatch(controlledJs, /ems-check-menu-btn/);
  assert.doesNotMatch(controlledJs, /window\.navigate/);
  assert.doesNotMatch(emergencyJs, /ems-check-menu-btn/);
  assert.doesNotMatch(emergencyJs, /window\.navigate/);
});
