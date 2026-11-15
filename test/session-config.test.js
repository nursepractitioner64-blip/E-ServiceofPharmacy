const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('PostgreSQL configuration requires DATABASE_URL and exports a shared pool', () => {
  const source = read('src/config/postgres.js');
  assert.match(source, /DATABASE_URL/);
  assert.match(source, /new\s+Pool\s*\(/);
  assert.match(source, /closePostgres/);
  assert.match(source, /module\.exports/);
});

test('session middleware uses PostgreSQL table and the existing eight-hour cookie contract', () => {
  const source = read('src/config/session.js');
  assert.match(source, /connect-pg-simple/);
  assert.match(source, /tableName\s*:\s*['"]user_sessions['"]/);
  assert.match(source, /createTableIfMissing\s*:\s*true/);
  assert.match(source, /name\s*:\s*['"]esp_session['"]/);
  assert.match(source, /8\s*\*\s*60\s*\*\s*60\s*\*\s*1000/);
  assert.match(source, /httpOnly\s*:\s*true/);
  assert.match(source, /sameSite\s*:\s*['"]lax['"]/i);
  assert.match(source, /secure\s*:/);
  assert.match(source, /resave\s*:\s*false/);
  assert.match(source, /saveUninitialized\s*:\s*false/);
  assert.match(source, /closeSessionStore/);
});

test('server trusts the Render proxy and mounts session middleware before API routes', () => {
  const source = read('server.js');
  const proxy = source.indexOf("app.set('trust proxy'");
  const session = source.indexOf('app.use(createSessionMiddleware())');
  const api = source.indexOf("app.use(\n  \"/api\",");
  assert.notEqual(proxy, -1, 'trust proxy must be configured');
  assert.notEqual(session, -1, 'session middleware must be mounted');
  assert.notEqual(api, -1, 'API router must be mounted');
  assert.ok(proxy < session && session < api, 'proxy and session middleware must precede API routes');
});

test('auth routes use persistent express-session lifecycle rather than custom cookies', () => {
  const service = read('src/modules/auth/auth.service.js');
  const routes = read('src/modules/auth/auth.routes.js');
  assert.doesNotMatch(service, /const\s+sessions\s*=\s*new Map\s*\(/);
  assert.match(service, /req\.session\.regenerate/);
  assert.match(service, /req\.session\.destroy/);
  assert.match(service, /user_sessions/);
  assert.match(routes, /auth\.createSession\(user,\s*req,\s*res\)/);
});
