const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { AREAS } = require('../scripts/publish-line-rich-menu');
const root = path.resolve(__dirname, '..');

test('Rich Menu image is PNG at LINE dimensions and below 1 MB', () => {
  const file = fs.readFileSync(path.join(root, 'public/assets/images/line-rich-menu.png'));
  assert.equal(file.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(file.readUInt32BE(16), 2500);
  assert.equal(file.readUInt32BE(20), 1686);
  assert.ok(file.length <= 1024 * 1024, `image is ${file.length} bytes`);
});

test('seven tap areas are non-overlapping, within bounds, and cover all agreed routes', () => {
  assert.equal(AREAS.length, 7);
  const routes = ['estockscan-session','estockscan-dispense','temperature-entry','equipment','dashboard','reports','notifications'];
  assert.deepEqual(AREAS.map(x => x.route), routes);
  for (const a of AREAS) {
    assert.ok(a.bounds.x >= 0 && a.bounds.y >= 0);
    assert.ok(a.bounds.width > 0 && a.bounds.height > 0);
    assert.ok(a.bounds.x + a.bounds.width <= 2500);
    assert.ok(a.bounds.y + a.bounds.height <= 1686);
  }
  for (let i=0;i<AREAS.length;i++) for(let j=i+1;j<AREAS.length;j++) {
    const a=AREAS[i].bounds,b=AREAS[j].bounds;
    const overlap = a.x < b.x+b.width && a.x+a.width > b.x && a.y < b.y+b.height && a.y+a.height > b.y;
    assert.equal(overlap,false,`areas ${i} and ${j} overlap`);
  }
});

test('publisher uses documented LINE create, upload, and default endpoints', () => {
  const s = fs.readFileSync(path.join(root, 'scripts/publish-line-rich-menu.js'), 'utf8');
  assert.match(s, /LINE_CHANNEL_ACCESS_TOKEN/);
  assert.match(s, /PUBLIC_BASE_URL/);
  assert.match(s, /api\.line\.me\/v2\/bot/);
  assert.match(s, /api-data\.line\.me\/v2\/bot/);
  assert.match(s, /user\/all\/richmenu/);
  assert.match(s, /Authorization: `Bearer \$\{TOKEN\}`/);
  assert.doesNotMatch(s, /Bearer\s+[A-Za-z0-9._-]{20,}/);
});

test('environment example and setup guide contain placeholders, not credentials', () => {
  const env = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
  const docs = fs.readFileSync(path.join(root, 'docs/LINE_RICH_MENU_SETUP.md'), 'utf8');
  assert.match(env, /LINE_CHANNEL_ACCESS_TOKEN=/);
  assert.match(env, /PUBLIC_BASE_URL=/);
  assert.match(docs, /not\*\* `LINE_CHANNEL_SECRET`/);
  assert.match(docs, /REPORTS.*Placeholder only|REPORTS/);
  assert.doesNotMatch(env, /LINE_CHANNEL_ACCESS_TOKEN=[^\s#]{20,}/);
});
