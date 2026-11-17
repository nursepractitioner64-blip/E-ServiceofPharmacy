const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

test("E-StockScan Quick Access DISPENSE reads LOT and stock from VACCINE_MOVEMENT", () => {
  const routes = read("src/modules/estockscan/estockscan.routes.js");
  const lotsBlock = routes.slice(routes.indexOf("async function getBranchVaccineMovements"), routes.indexOf("function withSessionLock"));
  assert.match(lotsBlock, /values\("VACCINE_MOVEMENT!A:P"\)/);
  assert.match(lotsBlock, /VACCINE_MOVEMENT ขาดคอลัมน์/);
  assert.match(lotsBlock, /row\.type === "IN"/);
  assert.match(lotsBlock, /row\.type === "OUT"/);
  assert.doesNotMatch(lotsBlock, /getInventoryMovements|INVENTORY_MOVEMENT/);
});

test("E-StockScan Quick Access DISPENSE saves OUT to VACCINE_MOVEMENT and details to INVENTORY_DISPENSE", () => {
  const routes = read("src/modules/estockscan/estockscan.routes.js");
  const dispensePost = routes.slice(routes.indexOf('router.post("/dispense"'), routes.indexOf("module.exports = router"));
  assert.match(dispensePost, /appendCells/);
  assert.match(dispensePost, /"VACCINE_MOVEMENT"/);
  assert.match(dispensePost, /"INVENTORY_DISPENSE"/);
  assert.match(dispensePost, /"OUT"/);
  assert.doesNotMatch(dispensePost, /createEStockScanDispense|INVENTORY_MOVEMENT/);
});

test("E-StockScan DISPENSE keeps branch protection using VACCINE_MOVEMENT Location", () => {
  const routes = read("src/modules/estockscan/estockscan.routes.js");
  assert.match(routes, /requireAuth, requireBranch/);
  assert.match(routes, /branchService\.listBranches/);
  assert.match(routes, /branchLocationMatches/);
  assert.match(routes, /branch\.BRANCH_NAME/);
});

test("E-StockScan DISPENSE client identifies VACCINE_MOVEMENT as LOT source", () => {
  const client = read("public/modules/estockscan/dispense.client.js");
  assert.match(client, /VACCINE_MOVEMENT/);
  assert.doesNotMatch(client, /Lot จาก INVENTORY_MOVEMENT/);
});

test("Hub SESSION continues to use INVENTORY_MOVEMENT and is not changed by DISPENSE migration", () => {
  const routes = read("src/modules/estockscan/estockscan.routes.js");
  const sessionLookup = routes.slice(routes.indexOf("async function getBranchMovements"), routes.indexOf("async function getInventoryMaster"));
  assert.match(sessionLookup, /getInventoryMovements/);
});
