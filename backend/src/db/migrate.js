require('dotenv').config();
const fs = require('node:fs/promises');
const path = require('node:path');
const { pool } = require('../config/db');

const projectRoot = path.resolve(__dirname, '../../..');
const schemaPath = path.join(projectRoot, 'database', 'schema.sql');
const migrationsPath = path.join(projectRoot, 'database', 'migrations');

async function runMigrations() {
  if (!pool) {
    throw new Error('PostgreSQL is not configured. Set DATABASE_URL in your environment.');
  }

  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(895771, 1)');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const baseline = await client.query(
      'SELECT 1 FROM schema_migrations WHERE name = $1',
      ['000_schema_baseline']
    );
    if (baseline.rowCount === 0) {
      const schema = await fs.readFile(schemaPath, 'utf8');
      await client.query(schema);
      await client.query(
        'INSERT INTO schema_migrations (name) VALUES ($1)',
        ['000_schema_baseline']
      );
      console.log('Applied 000_schema_baseline');
    }

    const migrationFiles = (await fs.readdir(migrationsPath))
      .filter((name) => /^\d+_[\w-]+\.sql$/.test(name))
      .sort();

    for (const name of migrationFiles) {
      const applied = await client.query(
        'SELECT 1 FROM schema_migrations WHERE name = $1',
        [name]
      );
      if (applied.rowCount > 0) continue;

      const migration = await fs.readFile(path.join(migrationsPath, name), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(migration);
        await client.query(
          'INSERT INTO schema_migrations (name) VALUES ($1)',
          [name]
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
      console.log(`Applied ${name}`);
    }
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock(895771, 1)');
    } finally {
      client.release();
      await pool.end();
    }
  }
}

runMigrations().catch((error) => {
  console.error('Database migration failed:', error.message);
  process.exitCode = 1;
});
