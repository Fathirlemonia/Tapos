require('dotenv').config();
const http = require('node:http');
const express = require('express');
const cors = require('cors');
const { pool } = require('./config/db');
const apiRoutes = require('./routes/api');
const { attachRealtime } = require('./realtime');

const app = express();
const PORT = process.env.PORT || 3000;
const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.startsWith('replace-with-')) {
  throw new Error('JWT_SECRET must be set to a random value of at least 32 characters.');
}

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    const error = new Error('Origin is not allowed by CORS.');
    error.status = 403;
    return callback(error);
  }
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', async (req, res) => {
  try {
    if (!pool) throw new Error('DATABASE_URL is not configured.');
    await pool.query('SELECT 1');
    return res.json({ ok: true, service: 'TAPOS API', database: 'connected', timestamp: new Date().toISOString() });
  } catch {
    return res.status(503).json({ ok: false, service: 'TAPOS API', database: 'unavailable' });
  }
});

app.use('/api', apiRoutes);

app.use((err, req, res, next) => {
  console.error('[TAPOS API ERROR]', err);
  const status = err.status || 500;
  res.status(status).json({
    error: status >= 500 ? 'Internal server error.' : err.message
  });
});

const server = http.createServer(app);
attachRealtime(server, allowedOrigins);

server.listen(PORT, () => {
  console.log(`TAPOS API running on http://localhost:${PORT}`);
});
