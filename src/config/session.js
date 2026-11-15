'use strict';

const session = require('express-session');
const connectPgSimple = require('connect-pg-simple');
const { pool } = require('./postgres');

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const SESSION_SECRET = String(process.env.SESSION_SECRET || '');
if (SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET must contain at least 32 characters for persistent sessions.');
}

const PgStore = connectPgSimple(session);
const store = new PgStore({
  pool,
  tableName: 'user_sessions',
  createTableIfMissing: true,
  pruneSessionInterval: 60 * 15
});

function createSessionMiddleware() {
  return session({
    name: 'esp_session',
    secret: SESSION_SECRET,
    store,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      maxAge: SESSION_TTL_MS,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/'
    }
  });
}

async function closeSessionStore() {
  if (typeof store.close === 'function') await store.close();
}

module.exports = { createSessionMiddleware, closeSessionStore, SESSION_TTL_MS };
