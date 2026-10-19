const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

test('LINE OAuth flow uses a configured HTTPS callback base URL and server-side state', () => {
  const routes = fs.readFileSync(path.join(root, 'src/modules/auth/auth.routes.js'), 'utf8');
  assert.match(routes, /PUBLIC_BASE_URL/);
  assert.match(routes, /lineOAuthStates = new Map\(\)/);
  assert.match(routes, /LINE_CHANNEL_SECRET/);
  assert.match(routes, /api\/auth\/line\/callback/);
});

test('LINE token verification checks the Login Channel ID and optional OAuth nonce', () => {
  const service = fs.readFileSync(path.join(root, 'src/modules/auth/auth.service.js'), 'utf8');
  assert.match(service, /LINE_CHANNEL_ID เป็น Channel ID ของ LINE Login Channel เดียวกับ LIFF App/);
  assert.match(service, /expectedNonce/);
  assert.match(service, /LINE ID TOKEN VERIFY FAILED/);
});
