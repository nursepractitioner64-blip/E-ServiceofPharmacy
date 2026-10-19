const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
test('E-ServiceofPharmacy LINE link endpoints require authentication', () => {
  const routes = fs.readFileSync(path.join(root, 'src/modules/auth/auth.routes.js'), 'utf8');
  assert.match(routes, /router\.post\('\/line\/link', requireAuth/);
  assert.match(routes, /router\.get\('\/line\/status', requireAuth/);
  assert.match(routes, /auth\.linkLineToExistingUser\(req\.authUser\.userId/);
});
test('LINE linking refuses duplicate identities and does not create a new user', () => {
  const service = fs.readFileSync(path.join(root, 'src/modules/auth/auth.service.js'), 'utf8');
  assert.match(service, /async function linkLineToExistingUser/);
  assert.match(service, /บัญชี LINE นี้ผูกกับผู้ใช้งานอื่นแล้ว/);
  assert.match(service, /await updateUserRow\(user\.__rowNumber, user\)/);
  assert.doesNotMatch(service.slice(service.indexOf('async function linkLineToExistingUser'), service.indexOf('async function registerPublicUser')), /appendUser\(/);
});
test('authenticated UI has a LINE link button that opens the hosted QR-capable OAuth flow', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const js = fs.readFileSync(path.join(root, 'public/assets/js/auth.link-line.js'), 'utf8');
  assert.match(html, /id="auth-link-line-button"/);
  assert.match(html, /auth\.link-line\.js/);
  assert.match(js, /\/api\/auth\/line\/link-authorize/);
  assert.match(js, /สแกน QR Code/);
});
