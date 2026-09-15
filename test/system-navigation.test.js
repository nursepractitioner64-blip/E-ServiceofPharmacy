const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

test("both system entry routes are complete", () => {
  const app = read("public/assets/js/app.js");

  for (const route of [
    "dashboard",
    "emergency-checklist",
    "controlled-drug",
    "inventory-master",
    "receive-stock",
    "inventorydispense",
    "receivedrug",
    "dispense",
    "stockout",
    "dailycheck"
  ]) {
    assert.match(app, new RegExp(`\\b${route.replace(/[-]/g, "\\-")}\\b`));
  }
});

test("system views use route attributes, not module-owned navigation", () => {
  const emergency = read("public/views/emergencycheck.html");
  const controlled = read("public/views/controlleddrug.html");
  const emergencyClient = read("public/modules/emergencycheck/emergencycheck.client.js");
  const controlledClient = read("public/modules/controlleddrug/controlleddrug.client.js");

  assert.match(emergency, /data-route="inventory-master"/);
  assert.match(emergency, /data-route="receive-stock"/);
  assert.match(emergency, /data-route="inventorydispense"/);
  assert.match(emergency, /data-route="dailycheck"/);
  assert.match(emergency, /data-route="dashboard"/);

  assert.match(controlled, /data-route="receivedrug"/);
  assert.match(controlled, /data-route="dispense"/);
  assert.match(controlled, /data-route="stockout"/);
  assert.match(controlled, /data-route="dailycheck"/);
  assert.match(controlled, /data-route="dashboard"/);

  for (const source of [emergencyClient, controlledClient]) {
    assert.doesNotMatch(source, /window\.navigate/);
    assert.doesNotMatch(source, /ems-check-menu-btn/);
  }
});

test("SPA has exactly one delegated navigation handler", () => {
  const app = read("public/assets/js/app.js");
  assert.equal(
    (app.match(/document\.addEventListener\(\s*"click"/g) || []).length,
    1
  );
});

test("server has one central /api module mount", () => {
  const server = read("server.js");
  assert.match(server, /app\.use\(\s*"\/api",\s*apiRoutes\s*\)/);
  assert.doesNotMatch(
    server,
    /app\.use\(\s*"\/api\/dispense"[\s\S]*?dispenseRoutes/
  );
});
