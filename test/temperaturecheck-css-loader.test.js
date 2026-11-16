const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const app = fs.readFileSync(path.join(__dirname, '../public/assets/js/app.js'), 'utf8');

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
