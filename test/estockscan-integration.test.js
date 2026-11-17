
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

test("E-StockScan SESSION and DISPENSE are mounted under an isolated Hub API namespace", () => {
  const routes = read("src/routes/index.js");
  assert.match(routes, /router\.use\(\s*"\/estockscan",\s*require\("\.\.\/modules\/estockscan\/estockscan\.routes"\)\s*\)/);
  assert.match(routes, /"\/dispense"[\s\S]*dispense\.routes/);
});

test("SESSION APIs require Hub authentication and active branch context", () => {
  const source = read("src/modules/estockscan/estockscan.routes.js");
  assert.match(source, /router\.get\("\/session\/new", requireAuth, requireBranch/);
  assert.match(source, /router\.get\("\/movement\/:id", requireAuth, requireBranch/);
  assert.match(source, /router\.post\("\/complete", requireAuth, requireBranch/);
  assert.match(source, /COUNT_HEADERS = \["SESSION_ID", "MOVEMENT_ID", "CODE", "NAME", "QTY", "USER", "TIME", "BRANCH_ID"\]/);
});

test("SESSION blocks duplicate movement IDs and keeps results separated by BRANCH_ID", () => {
  const source = read("src/modules/estockscan/estockscan.routes.js");
  assert.match(source, /DUPLICATE_SCAN/);
  assert.match(source, /existingIds\.has\(id\)/);
  assert.match(source, /clean\(r\[7\]\) === branchId/);
  assert.match(source, /RESULT_HEADERS = \["SESSION", "CODE", "REQUIRED", "ACTUAL", "DIFF", "BRANCH_ID"\]/);
});

test("DISPENSE reads and writes VACCINE_MOVEMENT with INVENTORY_DISPENSE detail", () => {
  const routes = read("src/modules/estockscan/estockscan.routes.js");
  const lots = routes.slice(routes.indexOf("async function getBranchVaccineMovements"), routes.indexOf("function withSessionLock"));
  const dispense = routes.slice(routes.indexOf('router.post("/dispense"'), routes.indexOf("module.exports = router"));
  assert.match(lots, /VACCINE_MOVEMENT!A:P/);
  assert.match(lots, /branchLocationMatches/);
  assert.match(dispense, /appendCells/);
  assert.match(dispense, /VACCINE_MOVEMENT/);
  assert.match(dispense, /INVENTORY_DISPENSE/);
  assert.doesNotMatch(dispense, /INVENTORY_MOVEMENT|createEStockScanDispense/);
  assert.doesNotMatch(routes, /CART_ID/i);
});

test("Dashboard Quick Access routes SESSION and DISPENSE inside the Hub SPA", () => {
  const dashboard = read("public/views/dashboard.html");
  const app = read("public/assets/js/app.js");
  assert.match(dashboard, /href="#estockscan-session" data-route="estockscan-session"/);
  assert.match(dashboard, /href="#estockscan-dispense" data-route="estockscan-dispense"/);
  assert.doesNotMatch(dashboard, /e-stockscan-ilbj\.onrender\.com/);
  assert.match(app, /"estockscan-session":\s*\{/);
  assert.match(app, /"estockscan-dispense":\s*\{/);
});
