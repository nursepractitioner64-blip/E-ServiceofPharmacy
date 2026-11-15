const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('auth service uses express-session request state instead of an in-memory session map', () => {
  const service = read('src/modules/auth/auth.service.js');
  assert.doesNotMatch(service, /const\s+sessions\s*=\s*new Map\s*\(/);
  assert.match(service, /req\.session/);
  assert.match(service, /req\.sessionID/);
  assert.match(service, /req\.session\.regenerate/);
  assert.match(service, /req\.session\.destroy/);
});

test('login and LINE callback pass the request into persistent session creation', () => {
  const routes = read('src/modules/auth/auth.routes.js');
  assert.match(routes, /auth\.createSession\(user,\s*req,\s*res\)/);
  assert.match(routes, /auth\.destroySession\(req,\s*res\)/);
});

test('branch selection persists the selected branch before responding', () => {
  const routes = read('src/modules/branches/branches.routes.js');
  assert.match(routes, /await\s+auth\.setSessionBranch\(req,\s*['"]ALL['"]\)/);
  assert.match(routes, /await\s+auth\.setSessionBranch\(req,\s*branchId\)/);
});
