const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const repositoryPath = path.join(root, "src/modules/dispense/dispense.repository.js");
const repository = require(repositoryPath);

test("available LOTs are aggregated by CODE + LOT + EXP within the selected branch", () => {
  const rows = [
    { TYPE: "IN", CODE: "DRUG01", LOT: "L1", EXP: "2027-12-31", QTY: 10, BRANCH_ID: "B1", NAME: "Drug", UNIT: "กล่อง" },
    { TYPE: "OUT", CODE: "DRUG01", LOT: "L1", EXP: "2027-12-31", QTY: 3, BRANCH_ID: "B1" },
    { TYPE: "IN", CODE: "DRUG01", LOT: "L2", EXP: "2028-12-31", QTY: 5, BRANCH_ID: "B1" },
    { TYPE: "OUT", CODE: "DRUG01", LOT: "L2", EXP: "2028-12-31", QTY: 5, BRANCH_ID: "B1" },
    { TYPE: "IN", CODE: "DRUG01", LOT: "L3", EXP: "2028-12-31", QTY: 99, BRANCH_ID: "B2" },
    { TYPE: "IN", CODE: "OTHER", LOT: "L4", EXP: "2028-12-31", QTY: 99, BRANCH_ID: "B1" }
  ];
  const result = repository.aggregateAvailableLots(rows, "DRUG01", "B1");
  assert.equal(result.length, 1);
  assert.equal(result[0].LOT, "L1");
  assert.equal(result[0].BALANCE, 7);
  assert.equal(result[0].CODE, "DRUG01");
});

test("DISPENSE route exposes protected available-lots endpoint before refNo route", () => {
  const routes = fs.readFileSync(path.join(root, "src/modules/dispense/dispense.routes.js"), "utf8");
  assert.match(routes, /router\.get\(\"\/available-lots\/:code\", requireAuth, requireBranch, controller\.getAvailableLots\)/);
});

test("DISPENSE client loads LOT choices from the inventory ledger API", () => {
  const client = fs.readFileSync(path.join(root, "public/modules/dispense/dispense.client.js"), "utf8");
  assert.match(client, /\/api\/dispense\/available-lots\/\$\{encodeURIComponent\(code\)\}/);
  assert.match(client, /ไม่พบ LOT ที่มียอดคงเหลือ/);
});
