const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const appJs = fs.readFileSync(path.join(root, 'public/assets/js/app.js'), 'utf8');

const destinations = {
  dashboard: '/views/dashboard.html',
  'estockscan-session': '/views/estockscan-session.html',
  'estockscan-dispense': '/views/estockscan-dispense.html',
  'temperature-entry': '/views/temperature-entry.html',
  equipment: '/views/equipment.html',
  reports: '/views/reports.html',
  notifications: '/views/notifications.html'
};

test('all seven LINE Rich Menu destinations are registered in the main SPA router', () => {
  for (const [route, view] of Object.entries(destinations)) {
    assert.match(appJs, new RegExp(`["']?${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']?\\s*:\\s*\\{[\\s\\S]*?view:\\s*["']${view.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`), `${route} route should point to ${view}`);
    assert.equal(fs.existsSync(path.join(root, 'public', view)), true, `${view} should exist`);
  }
});

test('Reports and Notifications are explicit placeholders without fake operational data', () => {
  const reports = fs.readFileSync(path.join(root, 'public/views/reports.html'), 'utf8');
  const notifications = fs.readFileSync(path.join(root, 'public/views/notifications.html'), 'utf8');

  assert.match(reports, /REPORTS/);
  assert.match(reports, /อยู่ระหว่างพัฒนา/);
  assert.match(reports, /ยังไม่พร้อมใช้งาน/);
  assert.match(notifications, /NOTIFICATIONS/);
  assert.match(notifications, /อยู่ระหว่างพัฒนา/);
  assert.match(notifications, /ยังไม่พร้อมใช้งาน/);
});

test('placeholder destinations do not load operational JavaScript modules', () => {
  for (const route of ['reports', 'notifications']) {
    const match = appJs.match(new RegExp(`${route}\\s*:\\s*\\{([^}]+)\\}`));
    assert.ok(match, `${route} route should exist`);
    assert.match(match[1], /script:\s*null/);
  }
});
