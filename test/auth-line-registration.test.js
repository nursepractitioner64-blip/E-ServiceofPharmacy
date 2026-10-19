const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const service = fs.readFileSync(path.join(root, 'src/modules/auth/auth.service.js'), 'utf8');
const routes = fs.readFileSync(path.join(root, 'src/modules/auth/auth.routes.js'), 'utf8');
const page = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const client = fs.readFileSync(path.join(root, 'public/assets/js/auth.register.js'), 'utf8');

test('public registration supports manual registration and creates Pending USER', () => {
  assert.ok(service.includes('async function registerPublicUser'));
  assert.ok(service.includes("LINE_USER_ID: line?.userId || ''"));
  assert.ok(service.includes("STATUS: 'PENDING'"));
  assert.ok(service.includes("ROLE: 'USER'"));
  assert.ok(service.includes("BRANCH_IDS: ''"));
  assert.ok(service.includes('const line = idToken ? await verifyLineIdToken(idToken) : null'));
});

test('public registration provides a choice between manual form and LINE OAuth', () => {
  assert.ok(routes.includes("router.get('/line/register-authorize'"));
  assert.ok(routes.includes("router.post('/register'"));
  assert.ok(routes.includes('lineRegistrationTokens'));
  assert.ok(page.includes('id="auth-register-choice"'));
  assert.ok(page.includes('id="auth-register-manual-choice"'));
  assert.ok(page.includes('id="auth-register-line-choice"'));
});

test('manual registration submits without LINE while LINE registration requires one-time verified token', () => {
  assert.ok(client.includes('registration_method: currentMethod'));
  assert.ok(client.includes('payload.line_registration_token = lineRegistrationToken'));
  assert.ok(client.includes('สมัครโดยกรอกข้อมูล') === false); // Choice text is owned by the HTML view.
  assert.ok(page.includes('สมัครโดยกรอกข้อมูล'));
  assert.ok(client.includes('กรุณายืนยันตัวตนผ่าน LINE ก่อนสมัครสมาชิก'));
});
