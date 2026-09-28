const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("emergency client is a valid module with init()", () => {
  const file = path.resolve(
    __dirname,
    "../public/modules/emergencycheck/emergencycheck.client.js"
  );
  const source = fs.readFileSync(file, "utf8");

  assert.equal(
    (source.match(/\/\*/g) || []).length,
    (source.match(/\*\//g) || []).length
  );
  assert.match(source, /export\s+async\s+function\s+init\s*\(/);
  assert.doesNotMatch(source, /\bloadChecklist\s*\(/);
});
