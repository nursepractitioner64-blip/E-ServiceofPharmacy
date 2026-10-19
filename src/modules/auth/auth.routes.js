const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const auth = require('./auth.service');
const { requireAuth, requireAdmin } = require('./auth.middleware');

// One-time OAuth states bind LINE callbacks to a login or account-link action.
const lineOAuthStates = new Map();
const lineRegistrationTokens = new Map();
const LINE_STATE_TTL_MS = 10 * 60 * 1000;
function publicBaseUrl(req) {
  const configured = String(process.env.PUBLIC_BASE_URL || '').trim().replace(/\/$/, '');
  if (configured) return configured;
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return `${proto}://${host}`;
}
function lineCallbackUrl(req) { return `${publicBaseUrl(req)}/api/auth/line/callback`; }
function startLineOAuth(req, res, intent, userId = '') {
  const channelId = String(process.env.LINE_CHANNEL_ID || '').trim();
  const channelSecret = String(process.env.LINE_CHANNEL_SECRET || '').trim();
  if (!channelId || !channelSecret) return res.status(503).send('ยังตั้งค่า LINE Login ไม่ครบ กรุณาตั้ง LINE_CHANNEL_ID และ LINE_CHANNEL_SECRET ใน .env แล้วรีสตาร์ตเซิร์ฟเวอร์');
  const state = crypto.randomBytes(32).toString('hex');
  const nonce = crypto.randomBytes(24).toString('hex');
  const redirectUri = lineCallbackUrl(req);
  lineOAuthStates.set(state, { intent, userId, nonce, redirectUri, expiresAt: Date.now() + LINE_STATE_TTL_MS });
  for (const [key, value] of lineOAuthStates.entries()) if (Date.now() > value.expiresAt) lineOAuthStates.delete(key);
  const authorize = new URL('https://access.line.me/oauth2/v2.1/authorize');
  authorize.search = new URLSearchParams({ response_type: 'code', client_id: channelId, redirect_uri: redirectUri, state, scope: 'openid profile', nonce }).toString();
  return res.redirect(302, authorize.toString());
}



// Use LINE's hosted Login page. Desktop users can scan its QR code with the LINE app.
router.get('/line/authorize', (req, res) => startLineOAuth(req, res, 'login'));
router.get('/line/link-authorize', requireAuth, (req, res) => startLineOAuth(req, res, 'link', req.authUser.userId));
router.get('/line/register-authorize', (req, res) => startLineOAuth(req, res, 'register'));
router.get('/line/callback', async (req, res) => {
  const state = String(req.query?.state || '');
  const pending = lineOAuthStates.get(state);
  lineOAuthStates.delete(state);
  const appUrl = `${publicBaseUrl(req)}/`;
  const fail = (message, intent = pending?.intent || 'login') => {
    const url = new URL(appUrl);
    const key = intent === 'link' ? 'lineLinkError' : (intent === 'register' ? 'registerLineError' : 'lineLoginError');
    url.searchParams.set(key, message);
    if (intent === 'register') url.searchParams.set('register', '1');
    return res.redirect(302, url.toString());
  };
  try {
    if (!pending || Date.now() > pending.expiresAt) return fail('คำขอ LINE Login หมดอายุ กรุณาลองใหม่');
    if (req.query?.error) return fail('ยกเลิกหรือเข้าสู่ระบบ LINE ไม่สำเร็จ กรุณาลองใหม่', pending.intent);
    const code = String(req.query?.code || '');
    if (!code) return fail('LINE ไม่ส่งรหัสยืนยันกลับมา กรุณาลองใหม่', pending.intent);
    const channelId = String(process.env.LINE_CHANNEL_ID || '').trim();
    const channelSecret = String(process.env.LINE_CHANNEL_SECRET || '').trim();
    const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: pending.redirectUri, client_id: channelId, client_secret: channelSecret })
    });
    const tokenData = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok || !tokenData.id_token) {
      console.error('LINE OAUTH TOKEN EXCHANGE FAILED:', JSON.stringify({ status: tokenResponse.status, error: tokenData.error || '' }));
      return fail('ยืนยันตัวตนกับ LINE ไม่สำเร็จ กรุณาตรวจสอบ Channel ID, Channel Secret และ Callback URL', pending.intent);
    }
    if (pending.intent === 'register') {
      // Validate the LINE ID token and OAuth nonce server-side before issuing
      // an opaque one-time token to the registration form.
      await auth.verifyLineIdToken(tokenData.id_token, pending.nonce);
      const registrationToken = crypto.randomBytes(32).toString('hex');
      const now = Date.now();
      for (const [key, value] of lineRegistrationTokens.entries()) if (now > value.expiresAt) lineRegistrationTokens.delete(key);
      lineRegistrationTokens.set(registrationToken, { idToken: tokenData.id_token, expiresAt: now + LINE_STATE_TTL_MS });
      const url = new URL(appUrl);
      url.searchParams.set('register', '1');
      url.searchParams.set('registerMethod', 'line');
      url.searchParams.set('lineRegistrationToken', registrationToken);
      return res.redirect(302, url.toString());
    }
    if (pending.intent === 'link') {
      const result = await auth.linkLineToExistingUser(pending.userId, tokenData.id_token);
      const url = new URL(appUrl); url.searchParams.set('lineLink', 'success');
      if (result.displayName) url.searchParams.set('lineName', result.displayName);
      return res.redirect(302, url.toString());
    }
    const user = await auth.authenticateByLineIdToken(tokenData.id_token);
    await auth.createSession(user, res);
    const url = new URL(appUrl); url.searchParams.set('lineLogin', 'success');
    return res.redirect(302, url.toString());
  } catch (err) {
    console.error('LINE OAUTH CALLBACK FAILED:', err.message);
    return fail(err.message || 'LINE Login ไม่สำเร็จ กรุณาลองใหม่');
  }
});

router.get('/config', (req, res) => {
  // Safe public configuration only; never return channel secrets or tokens.
  return res.json({
    ok: true,
    liffId: String(process.env.LINE_LIFF_ID || '').trim(),
    lineChannelConfigured: Boolean(String(process.env.LINE_CHANNEL_ID || '').trim())
  });
});

router.post('/line/verify', async (req, res) => {
  try {
    const line = await auth.verifyLineIdToken(req.body?.id_token);
    return res.json({ ok: true, line: { user_id: line.userId, display_name: line.displayName, picture_url: line.pictureUrl } });
  } catch (err) {
    return res.status(err.status || 401).json({ ok: false, message: err.message || 'ตรวจสอบ LINE ไม่สำเร็จ' });
  }
});

router.get('/line/status', requireAuth, async (req, res) => {
  try {
    const status = await auth.getLineLinkStatus(req.authUser.userId);
    return res.json({ ok: true, linked: status.linked, display_name: status.displayName });
  } catch (err) {
    return res.status(err.status || 500).json({ ok: false, message: err.message || 'ตรวจสอบสถานะ LINE ไม่สำเร็จ' });
  }
});

router.post('/line/link', requireAuth, async (req, res) => {
  try {
    const result = await auth.linkLineToExistingUser(req.authUser.userId, req.body?.id_token);
    return res.json({ ok: true, linked: true, display_name: result.displayName, message: result.message });
  } catch (err) {
    return res.status(err.status || (String(err.message || '').includes('ผูกกับ') ? 409 : 400)).json({ ok: false, message: err.message || 'ผูกบัญชี LINE ไม่สำเร็จ' });
  }
});

router.post('/register', async (req, res) => {
  let consumedRegistrationToken = '';
  try {
    const input = { ...(req.body || {}) };
    const registrationToken = String(input.line_registration_token || '').trim();
    if (registrationToken) {
      const pending = lineRegistrationTokens.get(registrationToken);
      if (!pending || Date.now() > pending.expiresAt) {
        lineRegistrationTokens.delete(registrationToken);
        return res.status(401).json({ ok: false, message: 'การยืนยันตัวตน LINE หมดอายุ กรุณายืนยัน LINE ใหม่อีกครั้ง' });
      }
      input.id_token = pending.idToken;
      consumedRegistrationToken = registrationToken;
    }
    const user = await auth.registerPublicUser(input);
    if (consumedRegistrationToken) lineRegistrationTokens.delete(consumedRegistrationToken);
    return res.status(201).json({ ok: true, user, message: user.message });
  } catch (err) {
    const status = err.status || (String(err.message || '').includes('ลงทะเบียนไว้แล้ว') || String(err.message || '').includes('ถูกใช้งานแล้ว') ? 409 : 400);
    return res.status(status).json({ ok: false, message: err.message || 'สมัครสมาชิกไม่สำเร็จ' });
  }
});

router.post('/login', async (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  try {
    const setup = await auth.initializeAuth();
    if (setup?.reason === 'environment_not_configured') {
      return res.status(503).json({ ok: false, message: 'ยังไม่ได้ตั้งค่า Admin เริ่มต้นบน Server กรุณาตั้ง AUTH_BOOTSTRAP_ADMIN_USERNAME และ AUTH_BOOTSTRAP_ADMIN_PASSWORD' });
    }
    if (!username || !password) return res.status(400).json({ ok: false, message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
    if (auth.isLoginBlocked(req, username)) return res.status(429).json({ ok: false, message: 'ลองเข้าสู่ระบบหลายครั้งเกินไป กรุณารอ 15 นาทีแล้วลองใหม่' });
    const user = await auth.authenticate(username, password);
    if (!user) {
      auth.recordLoginFailure(req, username);
      return res.status(401).json({ ok: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง หรือบัญชีถูกระงับ' });
    }
    auth.clearLoginFailures(req, username);
    const safeUser = await auth.createSession(user, res);
    return res.json({ ok: true, user: safeUser });
  } catch (err) {
    console.error('AUTH LOGIN ERROR:', err.message);
    return res.status(503).json({ ok: false, message: 'เข้าสู่ระบบไม่ได้ กรุณาตรวจสอบการตั้งค่า Server และ Google Sheets' });
  }
});

router.get('/me', (req, res) => {
  const session = auth.getSession(req);
  if (!session) return res.status(401).json({ ok: false, message: 'ยังไม่ได้เข้าสู่ระบบ' });
  return res.json({ ok: true, user: session.user, expiresAt: new Date(session.expiresAt).toISOString() });
});

router.post('/logout', (req, res) => {
  auth.destroySession(req, res);
  return res.json({ ok: true });
});

router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  try { return res.json({ ok: true, data: await auth.listUsers() }); }
  catch (err) { console.error('AUTH USERS ERROR:', err.message); return res.status(500).json({ ok: false, message: 'โหลดบัญชีผู้ใช้ไม่สำเร็จ' }); }
});

router.post('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const user = await auth.createManagedUser(req.body || {}, req.authUser);
    return res.status(201).json({ ok: true, data: user });
  } catch (err) {
    return res.status(400).json({ ok: false, message: err.message || 'สร้างบัญชีไม่สำเร็จ' });
  }
});

router.patch('/users/:userId/branches', requireAuth, requireAdmin, async (req, res) => {
  try {
    const branchIds = Array.isArray(req.body?.branchIds) ? req.body.branchIds : [];
    const changed = await auth.setUserBranches(req.params.userId, branchIds);
    if (!changed) return res.status(404).json({ ok: false, message: 'ไม่พบบัญชีผู้ใช้' });
    return res.json({ ok: true, message: 'บันทึกสาขาที่รับผิดชอบสำเร็จ' });
  } catch (err) { return res.status(400).json({ ok: false, message: err.message || 'บันทึกสาขาไม่สำเร็จ' }); }
});

router.put('/users/:userId/password', requireAuth, requireAdmin, async (req, res) => {
  try {
    const changed = await auth.setUserPassword(req.params.userId, req.body?.password);
    if (!changed) return res.status(404).json({ ok: false, message: 'ไม่พบบัญชีผู้ใช้' });
    return res.json({ ok: true, message: 'รีเซ็ตรหัสผ่านสำเร็จ' });
  } catch (err) { return res.status(400).json({ ok: false, message: err.message }); }
});

router.patch('/users/:userId/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const changed = await auth.setUserStatus(req.params.userId, req.body?.status, req.authUser);
    if (!changed) return res.status(404).json({ ok: false, message: 'ไม่พบบัญชีผู้ใช้' });
    return res.json({ ok: true, message: 'ปรับสถานะบัญชีสำเร็จ' });
  } catch (err) { return res.status(400).json({ ok: false, message: err.message }); }
});

module.exports = router;
