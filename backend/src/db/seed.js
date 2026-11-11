require('dotenv').config();
const bcrypt = require('bcryptjs');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pool } = require('../config/db');

const projectRoot = path.resolve(__dirname, '../../..');
const seedPath = path.join(projectRoot, 'database', 'seed.sql');

async function runSeed() {
  if (!pool) {
    throw new Error('PostgreSQL is not configured. Set DATABASE_URL in your environment.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(await fs.readFile(seedPath, 'utf8'));

    const seedDemoUsers = process.env.SEED_DEMO_USERS === 'true' || process.env.NODE_ENV !== 'production';
    if (seedDemoUsers) {
      const ownerPassword = process.env.SEED_OWNER_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'admin123');
      const cashierPassword = process.env.SEED_CASHIER_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'cashier123');
      if (!ownerPassword || !cashierPassword) {
        throw new Error('Set SEED_OWNER_PASSWORD and SEED_CASHIER_PASSWORD before seeding demo users in production.');
      }

      const employeeId = '12121212-1212-1212-1212-121212121212';
      await client.query(
        `INSERT INTO employees (id, full_name, position, status)
         VALUES ($1, 'Demo Cashier', 'Kasir', 'active')
         ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name`,
        [employeeId]
      );

      const accounts = [
        { username: 'owner@tapos', password: ownerPassword, role: 'owner', employeeId: null },
        { username: 'cashier@tapos', password: cashierPassword, role: 'cashier', employeeId }
      ];

      for (const account of accounts) {
        const passwordHash = await bcrypt.hash(account.password, 12);
        await client.query(
          `INSERT INTO users (username, password_hash, role_id, employee_id, is_active)
           VALUES ($1, $2, (SELECT id FROM roles WHERE name = $3), $4, TRUE)
           ON CONFLICT (username) DO UPDATE
             SET password_hash = EXCLUDED.password_hash,
                 role_id = EXCLUDED.role_id,
                 employee_id = EXCLUDED.employee_id,
                 is_active = TRUE`,
          [account.username, passwordHash, account.role, account.employeeId]
        );
      }
      console.log('Seeded development demo accounts.');
    }

    await client.query('COMMIT');
    console.log('Database seed completed.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runSeed().catch((error) => {
  console.error('Database seed failed:', error.message);
  process.exitCode = 1;
});
