const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
const { pool } = require('../config/db');
const { publish } = require('../services/events');
const {
  authenticateToken,
  requireRole,
  signAccessToken,
  signPriceSnapshot,
  verifyPriceSnapshot
} = require('../middleware/auth');

const router = express.Router();

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '');
}

function amountToNumber(value) {
  const amount = Number(value);
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
}

router.use((req, res, next) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database is unavailable. Configure DATABASE_URL.' });
  }
  next();
});

router.post('/auth/login', asyncRoute(async (req, res) => {
  const { username, password, role } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const result = await pool.query(
    `SELECT u.id, u.username, u.password_hash, r.name AS role,
            COALESCE(e.full_name, u.username) AS name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     LEFT JOIN employees e ON e.id = u.employee_id
     WHERE u.username = $1 AND u.is_active = TRUE`,
    [username.trim()]
  );
  const user = result.rows[0];
  const validPassword = user && await bcrypt.compare(password, user.password_hash);
  if (!validPassword || (role && role !== user.role)) {
    return res.status(401).json({ error: 'Invalid username, password, or role.' });
  }

  await pool.query(
    `INSERT INTO audit_logs (user_id, action_type, after_data)
     VALUES ($1, 'auth.login', jsonb_build_object('username', $2))`,
    [user.id, user.username]
  );
  const token = signAccessToken(user);
  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      username: user.username
    }
  });
}));

router.post('/auth/logout', authenticateToken, asyncRoute(async (req, res) => {
  await pool.query(
    `INSERT INTO audit_logs (user_id, action_type, after_data)
     VALUES ($1, 'auth.logout', jsonb_build_object('username', $2))`,
    [req.user.sub, req.user.username]
  );
  return res.status(204).end();
}));

router.get('/products', asyncRoute(async (req, res) => {
  const result = await pool.query(
    `SELECT p.id, p.name, c.name AS category, p.price::text AS price,
            COALESCE((SELECT SUM(i.quantity) FROM inventory i WHERE i.product_id = p.id), 0)::text AS stock,
            COALESCE((
              SELECT SUM(ti.quantity)
              FROM transaction_items ti
              JOIN transactions t ON t.id = ti.transaction_id
              WHERE ti.product_id = p.id AND t.status = 'paid'
            ), 0)::integer AS sold
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.is_active = TRUE
     ORDER BY c.name NULLS LAST, p.name`
  );
  const products = result.rows.map((product) => ({
    ...product,
    priceSnapshotToken: signPriceSnapshot(product)
  }));
  return res.json({ products, total: products.length });
}));

router.get('/inventory', authenticateToken, requireRole('owner'), asyncRoute(async (req, res) => {
  const result = await pool.query(
    `SELECT id, item_name AS name, quantity::text AS qty, unit,
            min_quantity::text AS min
     FROM inventory
     ORDER BY item_name`
  );
  return res.json({ inventory: result.rows });
}));

router.get('/dashboard/summary', authenticateToken, requireRole('owner'), asyncRoute(async (req, res) => {
  const result = await pool.query(
    `SELECT COALESCE(SUM(total_amount) FILTER (WHERE status = 'paid'), 0)::text AS sales_today,
            COUNT(*) FILTER (WHERE status = 'paid')::integer AS transaction_count,
            COALESCE(AVG(total_amount) FILTER (WHERE status = 'paid'), 0)::text AS avg_order
     FROM transactions
     WHERE created_at >= date_trunc('day', NOW())`
  );
  const items = await pool.query(
    `SELECT COALESCE(SUM(ti.quantity), 0)::integer AS items_sold
     FROM transaction_items ti
     JOIN transactions t ON t.id = ti.transaction_id
     WHERE t.status = 'paid' AND t.created_at >= date_trunc('day', NOW())`
  );
  const summary = result.rows[0];
  return res.json({
    salesToday: Number(summary.sales_today),
    transactionCount: summary.transaction_count,
    avgOrder: Math.round(Number(summary.avg_order)),
    itemsSold: items.rows[0].items_sold
  });
}));

router.get('/transactions', authenticateToken, requireRole('owner'), asyncRoute(async (req, res) => {
  const result = await pool.query(
    `SELECT t.id, t.transaction_code AS code, t.total_amount::text AS total,
            t.payment_method AS method, t.status, t.created_at AS time,
            COALESCE(e.full_name, u.username) AS cashier
     FROM transactions t
     LEFT JOIN users u ON u.id = t.user_id
     LEFT JOIN employees e ON e.id = u.employee_id
     ORDER BY t.created_at DESC
     LIMIT 200`
  );
  return res.json({ transactions: result.rows, total: result.rowCount });
}));

router.get('/transactions/:id', authenticateToken, requireRole('owner'), asyncRoute(async (req, res) => {
  if (!isUuid(req.params.id)) {
    return res.status(400).json({ error: 'Invalid transaction ID.' });
  }
  const transaction = await pool.query(
    `SELECT t.id, t.transaction_code AS code, t.total_amount::text AS total,
            t.subtotal::text AS subtotal, t.discount::text AS discount,
            t.payment_method AS method, t.status, t.order_channel AS channel,
            t.order_type AS order_type, t.table_label, t.discount_reason,
            t.cancellation_reason, t.created_at,
            COALESCE(e.full_name, u.username) AS cashier
     FROM transactions t
     LEFT JOIN users u ON u.id = t.user_id
     LEFT JOIN employees e ON e.id = u.employee_id
     WHERE t.id = $1`,
    [req.params.id]
  );
  if (transaction.rowCount === 0) return res.status(404).json({ error: 'Transaction not found.' });

  const [items, payments] = await Promise.all([
    pool.query(
      `SELECT product_snapshot_name AS name, quantity, unit_price::text AS unit_price,
              subtotal::text AS subtotal
       FROM transaction_items WHERE transaction_id = $1 ORDER BY created_at, id`,
      [req.params.id]
    ),
    pool.query(
      `SELECT amount::text AS amount, method, status, payment_reference, created_at
       FROM payments WHERE transaction_id = $1 ORDER BY created_at, id`,
      [req.params.id]
    )
  ]);
  return res.json({ ...transaction.rows[0], items: items.rows, payments: payments.rows });
}));

router.get('/activity', authenticateToken, requireRole('owner'), asyncRoute(async (req, res) => {
  const result = await pool.query(
    `SELECT a.id, a.action_type AS title, a.after_data AS detail, a.created_at AS time,
            COALESCE(e.full_name, u.username) AS actor
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.user_id
     LEFT JOIN employees e ON e.id = u.employee_id
     ORDER BY a.created_at DESC
     LIMIT 100`
  );
  return res.json({ activities: result.rows });
}));

router.post('/cashier/transactions', authenticateToken, requireRole('cashier'), asyncRoute(async (req, res) => {
  const {
    items = [],
    paymentMethod = 'Tunai',
    discountAmount = 0,
    discountReason = null,
    idempotencyKey,
    orderChannel = 'direct',
    orderType = 'takeaway',
    tableLabel = null,
    deviceId = null,
    deviceCreatedAt = null,
    status = 'paid'
  } = req.body || {};

  if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
    return res.status(400).json({ error: 'Provide between 1 and 100 transaction items.' });
  }
  if (typeof idempotencyKey !== 'string' || idempotencyKey.length < 8 || idempotencyKey.length > 128) {
    return res.status(400).json({ error: 'A valid idempotency key is required.' });
  }
  if (!['paid', 'unpaid'].includes(status)) {
    return res.status(400).json({ error: 'Invalid transaction status.' });
  }
  if (!['direct', 'whatsapp', 'gofood'].includes(orderChannel) || !['table', 'takeaway'].includes(orderType)) {
    return res.status(400).json({ error: 'Invalid order channel or type.' });
  }
  if (orderType === 'table' && (typeof tableLabel !== 'string' || !tableLabel.trim())) {
    return res.status(400).json({ error: 'A table label is required for table orders.' });
  }
  if (status === 'paid' && !['Tunai', 'QRIS', 'Debit', 'Transfer', 'GoFood'].includes(paymentMethod)) {
    return res.status(400).json({ error: 'Invalid payment method.' });
  }
  if (deviceId && !isUuid(deviceId)) {
    return res.status(400).json({ error: 'Invalid device ID.' });
  }

  const normalizedItems = [];
  for (const item of items) {
    const quantity = Number(item.quantity ?? item.qty);
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ error: 'Item quantities must be positive integers.' });
    }

    let snapshot;
    if (item.priceSnapshotToken) {
      try {
        snapshot = verifyPriceSnapshot(item.priceSnapshotToken);
      } catch {
        return res.status(400).json({ error: 'Invalid or altered product price snapshot.' });
      }
      if (snapshot.productId !== (item.productId || item.id)) {
        return res.status(400).json({ error: 'Price snapshot does not match the product.' });
      }
    } else {
      const productId = item.productId || item.id;
      if (!isUuid(productId)) return res.status(400).json({ error: 'A valid product ID is required.' });
      const productResult = await pool.query(
        'SELECT id, name, price::text AS price FROM products WHERE id = $1 AND is_active = TRUE',
        [productId]
      );
      if (productResult.rowCount === 0) return res.status(409).json({ error: 'Product is no longer available.' });
      const product = productResult.rows[0];
      if (item.price !== undefined && Number(item.price) !== Number(product.price)) {
        return res.status(409).json({ error: 'Price changed. Refresh the catalog and retry.' });
      }
      snapshot = { productId: product.id, name: product.name, price: product.price };
    }

    const unitPrice = amountToNumber(snapshot.price);
    if (unitPrice === null || !snapshot.name || unitPrice * quantity > Number.MAX_SAFE_INTEGER) {
      return res.status(400).json({ error: 'Invalid product price snapshot.' });
    }
    normalizedItems.push({
      productId: snapshot.productId,
      name: snapshot.name,
      unitPrice,
      quantity,
      subtotal: unitPrice * quantity
    });
  }

  const subtotal = normalizedItems.reduce((sum, item) => sum + item.subtotal, 0);
  const discount = amountToNumber(discountAmount);
  if (discount === null || discount > subtotal || (discount > 0 && !String(discountReason || '').trim())) {
    return res.status(400).json({ error: 'Discount must be valid and include a reason.' });
  }
  const total = subtotal - discount;
  const canonicalPayload = JSON.stringify({
    items: normalizedItems,
    paymentMethod: status === 'paid' ? paymentMethod : null,
    discount,
    discountReason: discountReason || null,
    orderChannel,
    orderType,
    tableLabel: tableLabel || null,
    deviceId,
    deviceCreatedAt,
    status
  });
  const payloadHash = crypto.createHash('sha256').update(canonicalPayload).digest('hex');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [idempotencyKey]);
    const previous = await client.query(
      `SELECT id, transaction_code, total_amount::text AS total, status,
              idempotency_payload_hash
       FROM transactions WHERE idempotency_key = $1`,
      [idempotencyKey]
    );
    if (previous.rowCount > 0) {
      await client.query('ROLLBACK');
      if (previous.rows[0].idempotency_payload_hash !== payloadHash) {
        return res.status(409).json({ error: 'Idempotency key was already used for a different transaction.' });
      }
      return res.status(200).json({ transaction: previous.rows[0], replayed: true });
    }

    const transactionCode = `TRX-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const transactionResult = await client.query(
      `INSERT INTO transactions (
         user_id, device_id, transaction_code, total_amount, subtotal, discount,
         payment_method, status, idempotency_key, idempotency_payload_hash,
         order_channel, order_type, table_label, discount_reason, device_created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING id, transaction_code, total_amount::text AS total, status, created_at`,
      [
        req.user.sub, deviceId, transactionCode, total, subtotal, discount,
        status === 'paid' ? paymentMethod : null, status, idempotencyKey, payloadHash,
        orderChannel, orderType, tableLabel ? tableLabel.trim() : null,
        discountReason ? String(discountReason).trim() : null,
        deviceCreatedAt && !Number.isNaN(Date.parse(deviceCreatedAt)) ? new Date(deviceCreatedAt) : null
      ]
    );
    const transaction = transactionResult.rows[0];

    for (const item of normalizedItems) {
      await client.query(
        `INSERT INTO transaction_items (
           transaction_id, product_id, product_snapshot_name, quantity, unit_price, subtotal
         ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [transaction.id, item.productId, item.name, item.quantity, item.unitPrice, item.subtotal]
      );
    }
    if (status === 'paid') {
      await client.query(
        `INSERT INTO payments (transaction_id, amount, method, status, received_by)
         VALUES ($1, $2, $3, 'success', $4)`,
        [transaction.id, total, paymentMethod, req.user.sub]
      );
    }
    await client.query(
      `INSERT INTO audit_logs (user_id, device_id, transaction_id, action_type, after_data)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [req.user.sub, deviceId, transaction.id, 'transaction.created', JSON.stringify({ transactionCode, total, itemCount: normalizedItems.length, status })]
    );
    await client.query('COMMIT');
    publish('transaction.created', {
      id: transaction.id,
      code: transaction.transaction_code,
      total: transaction.total,
      status: transaction.status
    });
    return res.status(201).json({ transaction, confirmed: true });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

router.get('/sync/queue', authenticateToken, requireRole('cashier'), (req, res) => {
  return res.status(410).json({ error: 'Offline transactions are queued on the cashier device and submitted for server confirmation.' });
});

module.exports = router;
