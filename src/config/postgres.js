'use strict';

const { Pool } = require('pg');

const connectionString = String(process.env.DATABASE_URL || '').trim();
if (!connectionString) {
  throw new Error('DATABASE_URL is required for persistent authentication sessions. Configure a PostgreSQL database before starting the service.');
}

const pool = new Pool({
  connectionString,
  // Render's managed PostgreSQL connection uses TLS. Explicit opt-in keeps
  // local development databases usable without weakening their TLS settings.
  ...(process.env.PGSSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {})
});

pool.on('error', error => {
  console.error('POSTGRES_POOL_ERROR:', error.message);
});

async function closePostgres() {
  await pool.end();
}

module.exports = { pool, closePostgres };
