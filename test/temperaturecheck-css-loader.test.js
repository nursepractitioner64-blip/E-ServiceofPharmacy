const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const app = fs.readFileSync(
  path.join(__dirname, '../public/assets/js/app.js'),
  'utf8'
);

test('CSS load handlers are registered before stylesheet is appended', () => {
  const onload = app.indexOf('link.onload = () =>');
  const onerror = app.indexOf('link.onerror = () =>');
  const append = app.indexOf('document.head.appendChild(link)', onerror);
  assert.ok(onload >= 0, 'onload handler exists');
  assert.ok(onerror >= 0, 'onerror handler exists');
  assert.ok(append >= 0, 'stylesheet append exists');
  assert.ok(onload < append, 'onload must be set before append');
  assert.ok(onerror < append, 'onerror must be set before append');
});

test('navigateWithoutHistory loads route CSS after loading the view', () => {
  const start = app.indexOf('async function navigateWithoutHistory');
  assert.ok(start >= 0, 'navigateWithoutHistory exists');

  const end = app.indexOf('/* =========================================================\n   ', start + 40);
  const block = app.slice(start, end > start ? end : undefined);
  const viewLoad = block.indexOf('await loadView(');
  const styleLoad = block.indexOf('await loadRouteStyle(');

  assert.ok(viewLoad >= 0, 'view is loaded');
  assert.ok(styleLoad >= 0, 'route stylesheet is loaded');
  assert.ok(styleLoad > viewLoad, 'stylesheet is loaded after the view');
  assert.match(block.slice(styleLoad, styleLoad + 120), /config\.style/);
});
