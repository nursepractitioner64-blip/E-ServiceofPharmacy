const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

test('login shell is first visible screen and application layout starts hidden', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  assert.ok(html.indexOf('id="auth-screen"') < html.indexOf('<div class="layout" style="display:none">'));
  assert.match(html, /id="auth-login-form"/);
  assert.match(html, /id="auth-logout-button"/);
});

test('auth endpoints are mounted under the central API router', () => {
  const routes = fs.readFileSync(path.join(root, 'src/routes/index.js'), 'utf8');
  assert.ok(routes.includes("router.use('/auth', require('./../modules/auth/auth.routes'));"));
});

test('Emergency and Daily Check APIs require a server-side session', () => {
  const emergency = fs.readFileSync(path.join(root, 'src/modules/emergencycheck/emergencycheck.routes.js'), 'utf8');
  const daily = fs.readFileSync(path.join(root, 'src/modules/dailycheck/dailycheck.routes.js'), 'utf8');
  assert.match(emergency, /router\.use\(requireAuth\)/);
  assert.match(daily, /router\.use\(requireAuth\)/);
  assert.match(daily, /req\.authUser\?\.fullName/);
  assert.doesNotMatch(daily, /user\s*\|\|\s*req\.user\?\.name/);
});

test('bootstrap credentials are documented without including real credentials', () => {
  const example = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
  const setup = fs.readFileSync(path.join(root, 'AUTH_LOGIN_SETUP.md'), 'utf8');
  assert.match(example, /AUTH_BOOTSTRAP_ADMIN_USERNAME/);
  assert.match(example, /AUTH_BOOTSTRAP_ADMIN_PASSWORD/);
  assert.match(setup, /Password/);
});

test('authentication uses the existing USERS schema and supports the stored scrypt hash format', () => {
  const service = fs.readFileSync(path.join(root, 'src/modules/auth/auth.service.js'), 'utf8');
  assert.match(service, /const USERS_SHEET = 'USERS'/);
  assert.match(service, /FULL_NAME_TH/);
  assert.match(service, /value\.startsWith\('scrypt:'\)/);
  assert.match(service, /REQUIRED_USER_COLUMNS = \['USER_ID', 'USERNAME', 'PASSWORD_HASH', 'STATUS', 'ROLE'\]/);
  assert.match(service, /function normalizeHeader/);
  assert.match(service, /values\[0\]\.map\(normalizeHeader\)/);
  assert.match(service, /BRANCH_IDS/);
  assert.match(service, /เพิ่มคอลัมน์ BRANCH_IDS ต่อท้ายชีต USERS/);
});

test('branch management routes and UI are registered', () => {
  const routes = fs.readFileSync(path.join(root, 'src/routes/index.js'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'public/assets/js/app.js'), 'utf8');
  const view = fs.readFileSync(path.join(root, 'public/views/branchmanagement.html'), 'utf8');
  assert.match(routes, /router.use\('\/branches', require\('\.\.\/modules\/branches\/branches\.routes'\)\)/);
  assert.match(app, /branch-management/);
  assert.match(view, /branch-name/);
});
