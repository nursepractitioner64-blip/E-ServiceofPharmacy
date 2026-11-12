const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = rel => fs.readFileSync(path.join(root, rel), "utf8");

test("Equipment API is mounted in its own isolated route", () => {
  const routes = read("src/routes/index.js");
  assert.match(routes, /"\/equipment"[\s\S]*equipment\.routes/);
  assert.match(read("src/modules/equipment/equipment.routes.js"), /router\.use\(requireAuth\)/);
});

test("Equipment Master and Checklist writes are restricted to ADMIN", () => {
  const routes = read("src/modules/equipment/equipment.routes.js");
  assert.match(routes, /router\.post\("\/master", requireAdmin/);
  assert.match(routes, /router\.put\("\/master\/:code", requireAdmin/);
  assert.match(routes, /router\.put\("\/master\/:code\/checklist", requireAdmin/);
});

test("Branch asset and inspection APIs require the existing branch permission middleware", () => {
  const routes = read("src/modules/equipment/equipment.routes.js");
  for (const signature of [
    'router.get("/branch-assets", requireBranch',
    'router.post("/branch-assets", requireBranch',
    'router.put("/branch-assets/:id", requireBranch',
    'router.post("/scan/resolve", requireBranch',
    'router.post("/inspections", requireBranch',
    'router.get("/reports/monthly", requireBranch'
  ]) assert.ok(routes.includes(signature), `Missing branch guard: ${signature}`);
});

test("Equipment data is stored in five dedicated Sheets and not Emergency sheets", () => {
  const routes = read("src/modules/equipment/equipment.routes.js");
  for (const sheet of ["EQUIPMENT_MASTER","EQUIPMENT_CHECKLIST_MASTER","BRANCH_EQUIPMENT","EQUIPMENT_INSPECTION","EQUIPMENT_INSPECTION_DETAIL"]) {
    assert.ok(routes.includes(sheet), `Missing ${sheet}`);
  }
  assert.doesNotMatch(routes, /EMERGENCY_CHECK_LOG/);
});

test("Monthly report aggregates one row per Master CODE and exposes per-asset day details", () => {
  const routes = read("src/modules/equipment/equipment.routes.js");
  assert.match(routes, /byCode\.set\(code,\[\]\)/);
  assert.match(routes, /router\.get\("\/reports\/day-details"/);
  assert.match(routes, /hasSevenDayFail/);
});

test("Equipment QR scanner, dynamic checklist and monthly report UI are registered", () => {
  const app = read("public/assets/js/app.js");
  const dashboard = read("public/views/dashboard.html");
  const view = read("public/views/equipment.html");
  const client = read("public/modules/equipment/equipment.client.js");
  assert.match(app, /equipment\.html/);
  assert.match(dashboard, /data-route="equipment"/);
  assert.match(view, /id="eqReader"/);
  assert.match(view, /id="eqChecklistFields"/);
  assert.match(view, /id="eqReportTable"/);
  assert.match(client, /Html5Qrcode/);
  assert.match(client, /data-day-detail/);
});

test("QR generation library is included without replacing the existing scanner library", () => {
  const html = read("public/index.html");
  assert.match(html, /html5-qrcode/);
  assert.match(html, /qrcode\.min\.js/);
});
