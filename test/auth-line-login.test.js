const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

test('LINE login resolves only one existing active USERS account by verified LINE identity', () => {
  const service = fs.readFileSync(path.join(root, 'src/modules/auth/auth.service.js'), 'utf8');
  assert.match(service, /async function authenticateByLineIdToken\(idToken\)/);
  assert.match(service, /const matches = users\.filter\(user => clean\(user\.LINE_USER_ID\) === line\.userId\)/);
  assert.match(service, /matches\.length > 1/);
  assert.match(service, /clean\(user\.STATUS\)\.toUpperCase\(\) !== 'ACTIVE'/);
  assert.match(service, /authenticateByLineIdToken, getLineLinkStatus/);
});

test('LINE login and link use LINE hosted OAuth authorization and a server callback', () => {
  const routes = fs.readFileSync(path.join(root, 'src/modules/auth/auth.routes.js'), 'utf8');
  assert.match(routes, /router\.get\('\/line\/authorize'/);
  assert.match(routes, /router\.get\('\/line\/link-authorize', requireAuth/);
  assert.match(routes, /router\.get\('\/line\/callback'/);
  assert.match(routes, /oauth2\/v2\.1\/authorize/);
  assert.match(routes, /oauth2\/v2\.1\/token/);
  assert.match(routes, /auth\.createSession\(user, res\)/);
});

test('login UI offers LINE QR Login and the existing account link action', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const js = fs.readFileSync(path.join(root, 'public/assets/js/auth.link-line.js'), 'utf8');
  assert.match(html, /id="auth-line-login-button"/);
  assert.match(html, /สแกน QR Code/);
  assert.match(js, /\/api\/auth\/line\/link-authorize/);
  assert.match(js, /สถานะ: บัญชีนี้ยังไม่ได้ผูก LINE/);
  assert.match(js, /lineLinkError/);
});
