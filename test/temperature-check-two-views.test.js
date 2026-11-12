const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "public/assets/js/app.js"), "utf8");
const dashboard = fs.readFileSync(path.join(root, "public/views/temperature-checklist.html"), "utf8");
const entry = fs.readFileSync(path.join(root, "public/views/temperature-entry.html"), "utf8");
const client = fs.readFileSync(path.join(root, "public/modules/temperaturecheck/temperaturecheck.client.js"), "utf8");

test("Temperature Check dashboard and entry use separate views", () => {
  assert.match(app, /"temperature-checklist"\s*:\s*\{\s*view:\s*"\/views\/temperature-checklist\.html"/);
  assert.match(app, /"temperature-entry"\s*:\s*\{\s*view:\s*"\/views\/temperature-entry\.html"/);
});

test("dashboard contains report controls but no data-entry form", () => {
  assert.match(dashboard, /id="tcReport"/);
  assert.match(dashboard, /id="tcMonth"/);
  assert.match(dashboard, /id="tcPrint"/);
  assert.doesNotMatch(dashboard, /id="temperatureForm"/);
});

test("entry contains the original compatible data-entry form only", () => {
  assert.match(entry, /id="temperatureForm"/);
  assert.match(entry, /id="tcDate"/);
  assert.match(entry, /id="tcTime"/);
  assert.match(entry, /id="tcValue"/);
  assert.doesNotMatch(entry, /id="tcReport"/);
});

test("both views share the existing API and backend status values", () => {
  assert.match(client, /const API = "\/api\/temperature-check\/records"/);
  assert.match(client, /record\?\.STATUS/);
  assert.match(client, /"09:00"/);
  assert.match(client, /"16:00"/);
});
