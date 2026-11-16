#!/usr/bin/env node
'use strict';

// Publishes the seven-area Nurse Station Hub Rich Menu as the LINE OA default.
// Required environment: LINE_CHANNEL_ACCESS_TOKEN and PUBLIC_BASE_URL.
// This script never prints or persists the access token.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
// Load local .env without overriding values already supplied by the shell/host.
const envFile = path.join(ROOT, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || Object.prototype.hasOwnProperty.call(process.env, match[1])) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
}

const IMAGE = path.join(ROOT, 'public/assets/images/line-rich-menu.png');
const API = 'https://api.line.me/v2/bot';
const DATA_API = 'https://api-data.line.me/v2/bot';
const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const BASE = (process.env.PUBLIC_BASE_URL || '').replace(/\/+$/, '');

const AREAS = [
  { bounds: { x: 0, y: 160, width: 833, height: 509 }, route: 'estockscan-session' },
  { bounds: { x: 833, y: 160, width: 834, height: 509 }, route: 'estockscan-dispense' },
  { bounds: { x: 1667, y: 160, width: 833, height: 509 }, route: 'temperature-entry' },
  { bounds: { x: 0, y: 669, width: 1250, height: 509 }, route: 'equipment' },
  { bounds: { x: 1250, y: 669, width: 1250, height: 509 }, route: 'dashboard' },
  { bounds: { x: 0, y: 1178, width: 1250, height: 508 }, route: 'reports' },
  { bounds: { x: 1250, y: 1178, width: 1250, height: 508 }, route: 'notifications' }
];

function validate() {
  if (!TOKEN) throw new Error('Missing LINE_CHANNEL_ACCESS_TOKEN. Set it in your local environment; do not paste it into chat.');
  if (!BASE || !/^https:\/\//i.test(BASE)) throw new Error('PUBLIC_BASE_URL must be the public HTTPS application URL.');
  if (!fs.existsSync(IMAGE)) throw new Error(`Rich Menu image not found: ${IMAGE}`);
  const stat = fs.statSync(IMAGE);
  if (stat.size > 1024 * 1024) throw new Error('Rich Menu image exceeds LINE 1 MB limit.');
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(options.headers || {})
    }
  });
  const body = await response.text();
  if (!response.ok) {
    // Do not print request headers or credentials.
    throw new Error(`LINE API request failed (${response.status}) at ${new URL(url).pathname}: ${body.slice(0, 500)}`);
  }
  if (!body) return {};
  try { return JSON.parse(body); } catch { return {}; }
}

async function main() {
  validate();
  const image = fs.readFileSync(IMAGE);
  const payload = {
    size: { width: 2500, height: 1686 },
    selected: true,
    name: 'Nurse Station Hub - 7 Menus',
    chatBarText: 'เมนูหลัก',
    areas: AREAS.map(({ bounds, route }) => ({
      bounds,
      action: { type: 'uri', uri: `${BASE}/#${route}` }
    }))
  };

  const created = await request(`${API}/richmenu`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!created.richMenuId) throw new Error('LINE did not return richMenuId after creating the menu.');

  await request(`${DATA_API}/richmenu/${encodeURIComponent(created.richMenuId)}/content`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/png' },
    body: image
  });

  await request(`${API}/user/all/richmenu/${encodeURIComponent(created.richMenuId)}`, { method: 'POST' });
  console.log('Rich Menu published as the LINE OA default.');
  console.log(`Rich Menu ID: ${created.richMenuId}`);
  console.log('Open the LINE OA chat again to refresh the default menu.');
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Rich Menu publish failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { AREAS };
