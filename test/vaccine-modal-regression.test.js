const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

test("vaccine master exposes a collection GET route before :code", () => {
  const source = fs.readFileSync(
    path.join(root, "src/modules/vaccinemaster/vaccinemaster.routes.js"),
    "utf8"
  );

  const listIndex = source.indexOf('router.get(\n  "/"');
  const codeIndex = source.indexOf('router.get(\n  "/:code"');

  assert.notEqual(listIndex, -1);
  assert.notEqual(codeIndex, -1);
  assert.ok(listIndex < codeIndex);
});

test("receive stock modal restores focus and updates aria-hidden state", () => {
  const source = fs.readFileSync(
    path.join(root, "public/modules/receivestock/receivestock.client.js"),
    "utf8"
  );

  assert.match(source, /modal\.setAttribute\(\s*"aria-hidden",\s*"false"\s*\)/);
  assert.match(source, /modal\.setAttribute\(\s*"aria-hidden",\s*"true"\s*\)/);
  assert.match(source, /activeElement\.blur\(\)/);
  assert.match(source, /openBtn\.focus\(\)/);
});
