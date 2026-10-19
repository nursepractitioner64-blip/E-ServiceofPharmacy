const crypto = require('crypto');
const { promisify } = require('util');
const { getSheets, getSpreadsheetId } = require('../../config/google');

const scryptAsync = promisify(crypto.scrypt);
const SESSION_COOKIE = 'esp_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const sessions = new Map();
const loginAttempts = new Map();
let bootstrapPromise = null;
let usersSheetPromise = null;

// Use the existing USERS sheet and its established schema. Never create a parallel account sheet.
const USERS_SHEET = 'USERS';
const REQUIRED_USER_COLUMNS = ['USER_ID', 'USERNAME', 'PASSWORD_HASH', 'STATUS', 'ROLE'];
const USER_HEADERS = ['USER_ID','FULL_NAME_TH','FULL_NAME_EN','POSITION','EMPLOYMENT_TYPE','USERNAME','PASSWORD_HASH','PHONE','EMAIL','LINE_USER_ID','LINE_DISPLAY_NAME','LINE_PICTURE_URL','STATUS','ROLE','CREATED_AT','BRANCH_IDS'];
let usersHeaders = null;

function clean(value) { return String(value ?? '').trim(); }
function normalizeHeader(value) { return clean(value).replace(/^\uFEFF/, '').replace(/[\s_]+/g, '_').toUpperCase(); }
function normalizeUsername(value) { return clean(value).toLowerCase(); }
function parseBranchIds(value) {
  const raw = clean(value);
  if (!raw) return [];
  if (raw.startsWith('[')) {
    try { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) return [...new Set(parsed.map(x => clean(x)).filter(Boolean))]; } catch (_) {}
  }
  return [...new Set(raw.split(/[,;|\n]+/).map(x => clean(x)).filter(Boolean))];
}
function nowIso() { return new Date().toISOString(); }
function randomId(prefix = 'USR') { return `${prefix}-${crypto.randomUUID()}`; }
function columnLetter(n) { let out = ''; while (n > 0) { const r = (n - 1) % 26; out = String.fromCharCode(65 + r) + out; n = Math.floor((n - 1) / 26); } return out; }

function cookieOptions(maxAgeSeconds) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

function getCookie(req, name) {
  const raw = String(req.headers.cookie || '');
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    if (part.slice(0, idx).trim() === name) return part.slice(idx + 1).trim();
  }
  return '';
}

function setSessionCookie(res, sid) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(sid)}; ${cookieOptions(Math.floor(SESSION_TTL_MS / 1000))}`);
}

function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}

function publicUser(user) {
  return {
    userId: user.USER_ID,
    username: user.USERNAME,
    fullName: user.FULL_NAME_TH || user.FULL_NAME || user.FULL_NAME_EN || user.USERNAME,
    role: clean(user.ROLE).toUpperCase() === 'ADMIN' ? 'ADMIN' : 'STAFF',
    branchIds: parseBranchIds(user.BRANCH_IDS)
  };
}

function rowsToUsers(values) {
  if (!values || !values.length) return [];
  const headers = values[0].map(normalizeHeader);
  return values.slice(1).map((row, index) => {
    const obj = {};
    headers.forEach((h, i) => { if (h) obj[h] = row[i] ?? ''; });
    obj.__rowNumber = index + 2;
    return obj;
  });
}

async function sheetTitles(sheets) {
  const result = await sheets.spreadsheets.get({
    spreadsheetId: getSpreadsheetId(),
    fields: 'sheets(properties(title))'
  });
  return (result.data.sheets || []).map(s => s.properties?.title).filter(Boolean);
}

async function ensureUsersSheet() {
  if (usersSheetPromise) return usersSheetPromise;
  usersSheetPromise = (async () => {
    const sheets = await getSheets();
    const titles = await sheetTitles(sheets);
    if (!titles.includes(USERS_SHEET)) {
      throw new Error('ไม่พบชีต USERS ใน Google Spreadsheet กรุณาตรวจสอบชื่อชีต');
    }
    const headerResult = await sheets.spreadsheets.values.get({
      spreadsheetId: getSpreadsheetId(), range: `${USERS_SHEET}!A1:Z1`
    });
    const existing = headerResult.data.values?.[0] || [];
    usersHeaders = existing.map(normalizeHeader);
    const missing = REQUIRED_USER_COLUMNS.filter(h => !usersHeaders.includes(h));
    if (missing.length) {
      console.error('AUTH USERS HEADER CHECK FAILED:', JSON.stringify({ found: usersHeaders, missing }));
      throw new Error(`ชีต USERS ขาดคอลัมน์ที่จำเป็น: ${missing.join(', ')}`);
    }
    // Append only our optional assignment column; preserve all existing columns and data.
    if (!usersHeaders.includes('BRANCH_IDS')) {
      const nextCol = usersHeaders.length + 1;
      const colName = columnLetter(nextCol);
      await sheets.spreadsheets.values.update({
        spreadsheetId: getSpreadsheetId(), range: `${USERS_SHEET}!${colName}1`,
        valueInputOption: 'RAW', requestBody: { values: [['BRANCH_IDS']] }
      });
      usersHeaders.push('BRANCH_IDS');
      console.log('🔐 AUTH: เพิ่มคอลัมน์ BRANCH_IDS ต่อท้ายชีต USERS เพื่อกำหนดสาขา');
    }
    return sheets;
  })().catch(err => { usersSheetPromise = null; usersHeaders = null; throw err; });
  return usersSheetPromise;
}

async function readUsers() {
  const sheets = await ensureUsersSheet();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(), range: `${USERS_SHEET}!A:Z`
  });
  const users = rowsToUsers(result.data.values || []);
  return users.map(user => {
    // Normalize the established staff table into the fields expected by auth/admin APIs.
    user.FULL_NAME = user.FULL_NAME_TH || user.FULL_NAME || user.FULL_NAME_EN || user.USERNAME;
    user.BRANCH_IDS = user.BRANCH_IDS || '';
    user.STATUS = clean(user.STATUS).toUpperCase() === 'ACTIVE' ? 'ACTIVE' : clean(user.STATUS).toUpperCase();
    user.ROLE = clean(user.ROLE).toUpperCase() === 'ADMIN' ? 'ADMIN' : 'STAFF';
    return user;
  });
}

function valuesForUser(user) {
  const values = {
    USER_ID: user.USER_ID,
    FULL_NAME_TH: user.FULL_NAME_TH || user.FULL_NAME || '',
    FULL_NAME_EN: user.FULL_NAME_EN || '',
    POSITION: user.POSITION || '',
    EMPLOYMENT_TYPE: user.EMPLOYMENT_TYPE || '',
    USERNAME: user.USERNAME,
    PASSWORD_HASH: user.PASSWORD_HASH,
    PHONE: user.PHONE || '',
    EMAIL: user.EMAIL || '',
    LINE_USER_ID: user.LINE_USER_ID || '',
    LINE_DISPLAY_NAME: user.LINE_DISPLAY_NAME || '',
    LINE_PICTURE_URL: user.LINE_PICTURE_URL || '',
    STATUS: user.STATUS || 'Active',
    ROLE: clean(user.ROLE).toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER',
    CREATED_AT: user.CREATED_AT || user.CREATED_AT || nowIso()
  };
  // Preserve any optional columns already present in a deployment, including branch metadata.
  for (const header of usersHeaders || USER_HEADERS) {
    if (!(header in values) && user[header] !== undefined) values[header] = user[header];
  }
  return (usersHeaders || USER_HEADERS).map(header => values[header] ?? '');
}

async function appendUser(user) {
  const sheets = await ensureUsersSheet();
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(), range: `${USERS_SHEET}!A:Z`,
    valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [valuesForUser(user)] }
  });
}

async function updateUserRow(rowNumber, user) {
  const sheets = await ensureUsersSheet();
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(), range: `${USERS_SHEET}!A${rowNumber}:${columnLetter((usersHeaders || USER_HEADERS).length)}${rowNumber}`, 
    valueInputOption: 'RAW', requestBody: { values: [valuesForUser(user)] }
  });
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scryptAsync(String(password), salt, 64);
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

async function verifyPassword(password, encoded) {
  const value = String(encoded || '');
  let scheme, salt, hash;
  if (value.startsWith('scrypt:')) [scheme, salt, hash] = value.split(':');
  else [scheme, salt, hash] = value.split('$');
  if (scheme !== 'scrypt' || !salt || !hash || !/^[a-f0-9]+$/i.test(hash)) return false;
  const actual = await scryptAsync(String(password), salt, hash.length / 2);
  const expected = Buffer.from(hash, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

async function verifyLineIdToken(idToken, expectedNonce = '') {
  const token = clean(idToken);
  if (!token) throw new Error('กรุณาเชื่อมต่อบัญชี LINE ก่อนสมัคร');
  const channelId = clean(process.env.LINE_CHANNEL_ID);
  if (!channelId) {
    const err = new Error('ยังไม่ได้ตั้งค่า LINE_CHANNEL_ID บน Server');
    err.status = 503;
    throw err;
  }
  const response = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ id_token: token, client_id: channelId })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.sub) {
    // Give an actionable setup hint without exposing the submitted ID token.
    const description = clean(data.error_description || data.message || '').toLowerCase();
    let message = 'LINE ตรวจสอบ ID Token ไม่สำเร็จ กรุณาเปิด LIFF ใหม่แล้วลองอีกครั้ง';
    if (description.includes('client_id') || description.includes('channel') || description.includes('invalid id_token')) {
      message = 'ตรวจสอบ LINE ID Token ไม่ผ่าน กรุณาตรวจว่า LINE_CHANNEL_ID เป็น Channel ID ของ LINE Login Channel เดียวกับ LIFF App และเปิด Scope openid แล้ว';
    }
    const err = new Error(message);
    err.status = response.status === 429 ? 429 : (response.status >= 500 ? 503 : 401);
    console.error('LINE ID TOKEN VERIFY FAILED:', JSON.stringify({ status: response.status, error: data.error || '', description: data.error_description || '' }));
    throw err;
  }
  if (expectedNonce && String(data.nonce || '') !== String(expectedNonce)) {
    const err = new Error('LINE ID Token ไม่ตรงกับคำขอเข้าสู่ระบบ กรุณาลองใหม่');
    err.status = 401;
    throw err;
  }
  return {
    userId: String(data.sub),
    displayName: String(data.name || ''),
    pictureUrl: String(data.picture || '')
  };
}

async function authenticateByLineIdToken(idToken) {
  const line = await verifyLineIdToken(idToken);
  const users = await readUsers();
  const matches = users.filter(user => clean(user.LINE_USER_ID) === line.userId);
  if (matches.length === 0) {
    const err = new Error('LINE นี้ยังไม่ได้ผูกกับบัญชีผู้ใช้ กรุณาเข้าสู่ระบบด้วย Username/Password แล้วกด “ผูกบัญชี LINE กับบัญชีเดิม” ก่อน');
    err.status = 403; throw err;
  }
  if (matches.length > 1) {
    const err = new Error('LINE นี้ผูกกับหลายบัญชีในระบบ กรุณาติดต่อ Admin เพื่อตรวจสอบข้อมูล');
    err.status = 409; throw err;
  }
  const user = matches[0];
  if (clean(user.STATUS).toUpperCase() !== 'ACTIVE') {
    const err = new Error('บัญชีนี้ยังไม่ Active หรือยังไม่ได้รับอนุมัติ');
    err.status = 403; throw err;
  }
  return user;
}

async function getLineLinkStatus(userId) {
  const users = await readUsers();
  const user = users.find(u => String(u.USER_ID) === String(userId));
  if (!user || clean(user.STATUS).toUpperCase() !== 'ACTIVE') {
    const err = new Error('บัญชีนี้ยังไม่สามารถใช้งานได้'); err.status = 403; throw err;
  }
  return { linked: Boolean(clean(user.LINE_USER_ID)), displayName: clean(user.LINE_DISPLAY_NAME) };
}

async function linkLineToExistingUser(userId, idToken) {
  const line = await verifyLineIdToken(idToken);
  const users = await readUsers();
  const user = users.find(u => String(u.USER_ID) === String(userId));
  if (!user || clean(user.STATUS).toUpperCase() !== 'ACTIVE') {
    const err = new Error('บัญชีนี้ยังไม่สามารถใช้งานได้'); err.status = 403; throw err;
  }

  const existingLineId = clean(user.LINE_USER_ID);
  if (existingLineId && existingLineId !== line.userId) {
    const err = new Error('บัญชีนี้ผูกกับ LINE อื่นอยู่แล้ว กรุณาติดต่อ Admin หากต้องการเปลี่ยนบัญชี LINE'); err.status = 409; throw err;
  }

  const duplicate = users.find(other =>
    String(other.USER_ID) !== String(user.USER_ID) && clean(other.LINE_USER_ID) === line.userId
  );
  if (duplicate) {
    const err = new Error('บัญชี LINE นี้ผูกกับผู้ใช้งานอื่นแล้ว ไม่สามารถผูกซ้ำได้'); err.status = 409; throw err;
  }

  user.LINE_USER_ID = line.userId;
  user.LINE_DISPLAY_NAME = line.displayName;
  user.LINE_PICTURE_URL = line.pictureUrl;
  await updateUserRow(user.__rowNumber, user);
  return {
    linked: true,
    displayName: line.displayName,
    pictureUrl: line.pictureUrl,
    message: existingLineId ? 'บัญชีนี้เชื่อมต่อ LINE อยู่แล้ว' : 'ผูกบัญชี LINE กับบัญชีเดิมสำเร็จ'
  };
}

async function registerPublicUser(input = {}) {
  // Manual registration does not require a LINE identity. LINE registration
  // supplies a server-issued, one-time registration token which the route
  // exchanges for an ID token before calling this service.
  const idToken = clean(input.id_token);
  const line = idToken ? await verifyLineIdToken(idToken) : null;
  const fullNameTh = clean(input.fullNameTh || input.full_name_th);
  const fullNameEn = clean(input.fullNameEn || input.full_name_en);
  const position = clean(input.position);
  const employmentType = clean(input.employmentType || input.employment_type);
  const username = normalizeUsername(input.username);
  const password = String(input.password || '');
  const confirmPassword = String(input.confirmPassword || input.confirm_password || '');
  const phone = clean(input.phone);
  const email = clean(input.email).toLowerCase();

  if (!fullNameTh || !fullNameEn || !position || !employmentType || !username || !password || !confirmPassword || !phone || !email) {
    throw new Error('กรุณากรอกข้อมูลให้ครบถ้วน');
  }
  if (!/^[a-z0-9._-]{3,50}$/.test(username)) throw new Error('Username ต้องมี 3–50 ตัวอักษร ใช้ a-z, 0-9, จุด ขีดกลาง หรือขีดล่าง');
  if (password.length < 8) throw new Error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
  if (password !== confirmPassword) throw new Error('Password และ Confirm Password ไม่ตรงกัน');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('รูปแบบ Email ไม่ถูกต้อง');
  if (!['Register Nurse', 'Public Health'].includes(position)) throw new Error('ตำแหน่งไม่ถูกต้อง');
  if (!['Full-Time', 'Part-Time'].includes(employmentType)) throw new Error('ประเภทการจ้างงานไม่ถูกต้อง');

  const users = await readUsers();
  if (users.some(u => normalizeUsername(u.USERNAME) === username)) throw new Error('Username นี้ถูกใช้งานแล้ว');
  if (line && users.some(u => clean(u.LINE_USER_ID) && clean(u.LINE_USER_ID) === line.userId)) throw new Error('บัญชี LINE นี้ลงทะเบียนไว้แล้วในระบบร่วม กรุณาติดต่อ Admin หากเป็นบัญชีเดิมของคุณ');

  const stamp = nowIso();
  const user = {
    USER_ID: randomId('USR'),
    FULL_NAME_TH: fullNameTh,
    FULL_NAME_EN: fullNameEn,
    POSITION: position,
    EMPLOYMENT_TYPE: employmentType,
    USERNAME: username,
    PASSWORD_HASH: await hashPassword(password),
    PHONE: phone,
    EMAIL: email,
    LINE_USER_ID: line?.userId || '',
    LINE_DISPLAY_NAME: line?.displayName || '',
    LINE_PICTURE_URL: line?.pictureUrl || '',
    STATUS: 'PENDING',
    ROLE: 'USER',
    CREATED_AT: stamp,
    BRANCH_IDS: ''
  };
  await appendUser(user);
  return {
    userId: user.USER_ID,
    username: user.USERNAME,
    fullName: user.FULL_NAME_TH,
    status: user.STATUS,
    role: 'STAFF',
    message: line ? 'สมัครสมาชิกผ่าน LINE สำเร็จ กรุณารอ Admin อนุมัติและกำหนดสาขาก่อนเข้าใช้งาน' : 'สมัครสมาชิกสำเร็จ กรุณารอ Admin อนุมัติและกำหนดสาขาก่อนเข้าใช้งาน'
  };
}

function getAttemptKey(req, username) {
  return `${req.ip || req.socket?.remoteAddress || 'unknown'}:${normalizeUsername(username)}`;
}

function isLoginBlocked(req, username) {
  const record = loginAttempts.get(getAttemptKey(req, username));
  if (!record) return false;
  if (Date.now() >= record.until) { loginAttempts.delete(getAttemptKey(req, username)); return false; }
  return record.count >= 5;
}

function recordLoginFailure(req, username) {
  const key = getAttemptKey(req, username);
  const record = loginAttempts.get(key) || { count: 0, until: Date.now() + 15 * 60 * 1000 };
  if (Date.now() >= record.until) { record.count = 0; record.until = Date.now() + 15 * 60 * 1000; }
  record.count += 1;
  loginAttempts.set(key, record);
}

function clearLoginFailures(req, username) { loginAttempts.delete(getAttemptKey(req, username)); }

async function initializeAuth() {
  if (bootstrapPromise) return bootstrapPromise;
  bootstrapPromise = (async () => {
    await ensureUsersSheet();
    const users = await readUsers();
    const existingAdmin = users.find(u => clean(u.ROLE).toUpperCase() === 'ADMIN');
    if (existingAdmin) {
      console.log('🔐 AUTH: พบ Admin อยู่แล้ว จึงไม่ทำ bootstrap ซ้ำ');
      return { bootstrapped: false, reason: 'admin_exists' };
    }
    const username = clean(process.env.AUTH_BOOTSTRAP_ADMIN_USERNAME);
    const password = String(process.env.AUTH_BOOTSTRAP_ADMIN_PASSWORD || '');
    if (!username || !password) {
      console.warn('🔐 AUTH: ยังไม่ได้ตั้ง AUTH_BOOTSTRAP_ADMIN_USERNAME / AUTH_BOOTSTRAP_ADMIN_PASSWORD; ข้ามการสร้าง Admin เริ่มต้น');
      return { bootstrapped: false, reason: 'environment_not_configured' };
    }
    if (password.length < 12) {
      throw new Error('AUTH_BOOTSTRAP_ADMIN_PASSWORD ต้องมีอย่างน้อย 12 ตัวอักษร');
    }
    if (users.some(u => normalizeUsername(u.USERNAME) === normalizeUsername(username))) {
      throw new Error('ชื่อ AUTH_BOOTSTRAP_ADMIN_USERNAME มีอยู่แล้วแต่ยังไม่มีบัญชี ADMIN กรุณาตรวจชีต USERS');
    }
    const stamp = nowIso();
    await appendUser({
      USER_ID: randomId('ADM'), USERNAME: username, PASSWORD_HASH: await hashPassword(password),
      FULL_NAME: clean(process.env.AUTH_BOOTSTRAP_ADMIN_FULL_NAME) || 'System Administrator',
      ROLE: 'ADMIN', STATUS: 'Active', CREATED_AT: stamp
    });
    console.log('🔐 AUTH: สร้าง Admin เริ่มต้นสำเร็จ; bootstrap จะไม่สร้างซ้ำเมื่อพบ Admin ใน USERS');
    return { bootstrapped: true };
  })().catch(err => { bootstrapPromise = null; throw err; });
  return bootstrapPromise;
}

async function authenticate(username, password) {
  const users = await readUsers();
  const user = users.find(u => normalizeUsername(u.USERNAME) === normalizeUsername(username));
  if (!user || clean(user.STATUS).toUpperCase() !== 'ACTIVE') return null;
  if (!(await verifyPassword(password, user.PASSWORD_HASH))) return null;
  return user;
}

async function createSession(user, res) {
  const sid = crypto.randomBytes(32).toString('base64url');
  const safe = publicUser(user);
  sessions.set(sid, { user: safe, expiresAt: Date.now() + SESSION_TTL_MS });
  setSessionCookie(res, sid);
  try {
    const latest = await readUsers();
    const row = latest.find(u => u.USER_ID === user.USER_ID);
    if (row) {
      row.LAST_LOGIN = nowIso();
      await updateUserRow(row.__rowNumber, row).catch(err => console.error('AUTH LAST_LOGIN UPDATE FAILED:', err.message));
    }
  } catch (err) {
    console.error('AUTH LAST_LOGIN READ FAILED:', err.message);
  }
  return safe;
}

function getSession(req) {
  const sid = getCookie(req, SESSION_COOKIE);
  if (!sid) return null;
  const session = sessions.get(sid);
  if (!session) return null;
  if (Date.now() >= session.expiresAt) { sessions.delete(sid); return null; }
  return { sid, ...session, currentBranchId: session.currentBranchId || '' };
}

function setSessionBranch(req, branchId) {
  const current = getSession(req);
  if (!current) return null;
  const session = sessions.get(current.sid);
  session.currentBranchId = String(branchId || '').trim();
  sessions.set(current.sid, session);
  return { currentBranchId: session.currentBranchId };
}

function remapBranchId(oldId, newId) {
  for (const [sid, session] of sessions.entries()) {
    if (session.currentBranchId === oldId) session.currentBranchId = newId;
    if (session.user && Array.isArray(session.user.branchIds)) {
      session.user.branchIds = session.user.branchIds.map(id => id === oldId ? newId : id);
    }
    sessions.set(sid, session);
  }
  return true;
}

function clearSessionBranch(req) {
  const current = getSession(req);
  if (!current) return false;
  const session = sessions.get(current.sid);
  session.currentBranchId = '';
  sessions.set(current.sid, session);
  return true;
}

function destroySession(req, res) {
  const sid = getCookie(req, SESSION_COOKIE);
  if (sid) sessions.delete(sid);
  clearSessionCookie(res);
}

async function listUsers() {
  return (await readUsers()).map(u => ({
    userId: u.USER_ID, username: u.USERNAME, fullName: u.FULL_NAME,
    role: clean(u.ROLE).toUpperCase() === 'ADMIN' ? 'ADMIN' : 'STAFF', status: clean(u.STATUS).toUpperCase(), branchIds: parseBranchIds(u.BRANCH_IDS),
    createdAt: u.CREATED_AT, lastLogin: u.LAST_LOGIN
  }));
}

async function createManagedUser(input, actor) {
  const username = clean(input.username);
  const password = String(input.password || '');
  const fullName = clean(input.fullName);
  const role = clean(input.role || 'STAFF').toUpperCase();
  const branchIds = Array.isArray(input.branchIds) ? input.branchIds.map(clean).filter(Boolean) : String(input.branchIds || '').split(',').map(clean).filter(Boolean);
  if (!/^[a-zA-Z0-9._-]{3,50}$/.test(username)) throw new Error('Username ต้องมี 3–50 ตัวอักษร ใช้ a-z, 0-9, จุด ขีดกลาง หรือขีดล่าง');
  if (password.length < 12) throw new Error('รหัสผ่านต้องมีอย่างน้อย 12 ตัวอักษร');
  if (!fullName) throw new Error('กรุณาระบุชื่อเจ้าหน้าที่');
  if (!['ADMIN', 'STAFF'].includes(role)) throw new Error('ROLE ไม่ถูกต้อง');
  const users = await readUsers();
  if (users.some(u => normalizeUsername(u.USERNAME) === normalizeUsername(username))) throw new Error('Username นี้มีอยู่แล้ว');
  const stamp = nowIso();
  await appendUser({
    USER_ID: randomId(role === 'ADMIN' ? 'ADM' : 'USR'), USERNAME: username,
    PASSWORD_HASH: await hashPassword(password), FULL_NAME: fullName, ROLE: role,
    STATUS: 'ACTIVE', BRANCH_IDS: branchIds.join(','), CREATED_BY: actor.userId,
    CREATED_AT: stamp, LAST_LOGIN: '', PASSWORD_CHANGED_AT: stamp
  });
  return { username, fullName, role, status: 'ACTIVE', branchIds };
}

async function setUserPassword(userId, password) {
  if (String(password || '').length < 12) throw new Error('รหัสผ่านต้องมีอย่างน้อย 12 ตัวอักษร');
  const users = await readUsers();
  const user = users.find(u => u.USER_ID === userId);
  if (!user) return false;
  user.PASSWORD_HASH = await hashPassword(password);
  user.PASSWORD_CHANGED_AT = nowIso();
  await updateUserRow(user.__rowNumber, user);
  // Revoke all active sessions for the changed account.
  for (const [sid, session] of sessions.entries()) {
    if (session.user.userId === userId) sessions.delete(sid);
  }
  return true;
}

async function setUserStatus(userId, status, actor) {
  const normalized = clean(status).toUpperCase();
  if (!['ACTIVE', 'INACTIVE'].includes(normalized)) throw new Error('สถานะบัญชีไม่ถูกต้อง');
  if (userId === actor.userId && normalized !== 'ACTIVE') throw new Error('ไม่สามารถระงับบัญชีของตนเองได้');
  const users = await readUsers();
  const user = users.find(u => u.USER_ID === userId);
  if (!user) return false;
  if (clean(user.ROLE).toUpperCase() === 'ADMIN' && normalized !== 'ACTIVE') {
    const activeAdmins = users.filter(u => clean(u.ROLE).toUpperCase() === 'ADMIN' && clean(u.STATUS).toUpperCase() === 'ACTIVE');
    if (activeAdmins.length <= 1) throw new Error('ไม่สามารถระงับ Admin คนสุดท้ายได้');
  }
  user.STATUS = normalized;
  await updateUserRow(user.__rowNumber, user);
  if (normalized !== 'ACTIVE') {
    for (const [sid, session] of sessions.entries()) if (session.user.userId === userId) sessions.delete(sid);
  }
  return true;
}

async function setUserBranches(userId, branchIds) {
  const normalized = [...new Set((Array.isArray(branchIds) ? branchIds : []).map(clean).filter(Boolean))];
  const users = await readUsers();
  const user = users.find(u => u.USER_ID === userId);
  if (!user) return false;
  user.BRANCH_IDS = normalized.join(',');
  await updateUserRow(user.__rowNumber, user);
  // Refresh active sessions so new branch permissions take effect immediately.
  for (const [sid, session] of sessions.entries()) {
    if (session.user.userId === userId) {
      session.user.branchIds = normalized;
      sessions.set(sid, session);
    }
  }
  return true;
}

module.exports = {
  initializeAuth, authenticate, createSession, getSession, setSessionBranch, remapBranchId, clearSessionBranch, destroySession,
  isLoginBlocked, recordLoginFailure, clearLoginFailures, listUsers,
  createManagedUser, registerPublicUser, verifyLineIdToken, authenticateByLineIdToken, getLineLinkStatus, linkLineToExistingUser, setUserPassword, setUserStatus, setUserBranches, publicUser
};
