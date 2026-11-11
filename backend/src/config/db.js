const { Pool } = require('pg');

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    })
  : null;

async function query(text, params = []) {
  if (!pool) {
    throw new Error('PostgreSQL is not configured. Set DATABASE_URL in your environment.');
  }

  return pool.query(text, params);
}

module.exports = { pool, query };
