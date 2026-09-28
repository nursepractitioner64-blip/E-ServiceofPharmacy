const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

test("all system menus use data-route and the central router handles both attributes", () => {
  const files = [
    "public/views/emergencycheck.html",
    "public/views/controlleddrug.html"
  ];

  for (const file of files) {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    assert.doesNotMatch(source, /data-page=/);
    assert.match(source, /data-route=/);
  }

  const app = fs.readFileSync(
    path.join(root, "public/assets/js/app.js"),
    "utf8"
  );

  assert.equal(
    (app.match(/document\.addEventListener\(\s*"click"/g) || []).length,
    1
  );
  assert.match(app, /\[data-route\], \[data-page\]/);
});
