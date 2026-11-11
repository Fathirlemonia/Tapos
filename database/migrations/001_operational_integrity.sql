ALTER TABLE business_profile ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE roles ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE employees ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE devices ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE categories ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE products ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE inventory ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE product_recipes ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE transactions ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE transaction_items ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE payments ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE shifts ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE attendance ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE cash_sessions ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE cash_movements ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE expenses ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE stock_movements ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE audit_logs ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE transactions
  ALTER COLUMN status SET DEFAULT 'unpaid',
  ADD COLUMN order_channel VARCHAR(30) NOT NULL DEFAULT 'direct',
  ADD COLUMN order_type VARCHAR(30) NOT NULL DEFAULT 'takeaway',
  ADD COLUMN table_label VARCHAR(50),
  ADD COLUMN discount_reason TEXT,
  ADD COLUMN cancellation_reason TEXT,
  ADD COLUMN cancelled_by UUID REFERENCES users(id),
  ADD COLUMN cancelled_at TIMESTAMPTZ,
  ADD COLUMN device_created_at TIMESTAMPTZ,
  ADD COLUMN idempotency_payload_hash CHAR(64);

UPDATE transactions SET status = 'unpaid' WHERE status = 'pending_sync';

ALTER TABLE transactions
  ADD CONSTRAINT transactions_status_check
    CHECK (status IN ('unpaid', 'paid', 'cancelled', 'refunded')),
  ADD CONSTRAINT transactions_channel_check
    CHECK (order_channel IN ('direct', 'whatsapp', 'gofood')),
  ADD CONSTRAINT transactions_order_type_check
    CHECK (order_type IN ('table', 'takeaway')),
  ADD CONSTRAINT transactions_amounts_check
    CHECK (total_amount >= 0 AND COALESCE(subtotal, total_amount) >= 0 AND discount >= 0);

ALTER TABLE transaction_items
  ALTER COLUMN product_snapshot_name SET NOT NULL,
  ADD CONSTRAINT transaction_items_quantity_check CHECK (quantity > 0),
  ADD CONSTRAINT transaction_items_amounts_check
    CHECK (unit_price >= 0 AND subtotal >= 0 AND subtotal = unit_price * quantity);

ALTER TABLE payments
  ADD COLUMN received_by UUID REFERENCES users(id),
  ADD COLUMN payment_reference VARCHAR(150),
  ADD CONSTRAINT payments_amount_check CHECK (amount >= 0),
  ADD CONSTRAINT payments_status_check
    CHECK (status IN ('pending', 'success', 'failed', 'refunded'));

ALTER TABLE users
  ADD CONSTRAINT users_employee_fk FOREIGN KEY (employee_id) REFERENCES employees(id);

ALTER TABLE inventory
  ADD CONSTRAINT inventory_quantity_check CHECK (quantity >= 0),
  ADD CONSTRAINT inventory_min_quantity_check CHECK (min_quantity >= 0);

ALTER TABLE products
  ADD CONSTRAINT products_price_check CHECK (price >= 0);

ALTER TABLE product_recipes
  ADD COLUMN inventory_id UUID REFERENCES inventory(id),
  ADD CONSTRAINT product_recipes_quantity_check CHECK (quantity_required > 0);

ALTER TABLE cash_sessions
  ADD COLUMN closed_by UUID REFERENCES users(id),
  ADD COLUMN counted_at TIMESTAMPTZ,
  ADD CONSTRAINT cash_sessions_balances_check
    CHECK (opening_balance >= 0 AND closing_balance >= 0 AND expected_balance >= 0);

ALTER TABLE cash_movements
  ADD CONSTRAINT cash_movements_amount_check CHECK (amount > 0);

ALTER TABLE expenses
  ADD COLUMN cash_session_id UUID REFERENCES cash_sessions(id),
  ADD COLUMN payment_method VARCHAR(30) NOT NULL DEFAULT 'Tunai',
  ADD COLUMN approved_by UUID REFERENCES users(id),
  ADD CONSTRAINT expenses_amount_check CHECK (amount > 0),
  ADD CONSTRAINT expenses_payment_method_check
    CHECK (payment_method IN ('Tunai', 'QRIS', 'Debit', 'Transfer'));

ALTER TABLE stock_movements
  ADD COLUMN transaction_id UUID REFERENCES transactions(id),
  ADD COLUMN transaction_item_id UUID REFERENCES transaction_items(id),
  ADD COLUMN created_by UUID REFERENCES users(id),
  ADD CONSTRAINT stock_movements_quantity_check CHECK (quantity > 0);

CREATE UNIQUE INDEX stock_movements_transaction_item_unique
  ON stock_movements (transaction_item_id, inventory_id, movement_type)
  WHERE transaction_item_id IS NOT NULL;

CREATE UNIQUE INDEX categories_name_unique ON categories (name);
CREATE UNIQUE INDEX products_sku_unique ON products (sku);
CREATE UNIQUE INDEX inventory_item_name_unique ON inventory (item_name);
CREATE INDEX transactions_created_at_idx ON transactions (created_at DESC);
CREATE INDEX transactions_user_created_at_idx ON transactions (user_id, created_at DESC);
CREATE INDEX transactions_status_created_at_idx ON transactions (status, created_at DESC);
CREATE INDEX transaction_items_transaction_id_idx ON transaction_items (transaction_id);
CREATE INDEX payments_transaction_id_idx ON payments (transaction_id);
CREATE INDEX shifts_employee_started_at_idx ON shifts (employee_id, started_at DESC);
CREATE INDEX attendance_employee_check_in_idx ON attendance (employee_id, check_in DESC);
CREATE INDEX inventory_item_name_idx ON inventory (item_name);
CREATE INDEX stock_movements_inventory_created_at_idx ON stock_movements (inventory_id, created_at DESC);
CREATE INDEX audit_logs_created_at_idx ON audit_logs (created_at DESC);
CREATE INDEX audit_logs_user_created_at_idx ON audit_logs (user_id, created_at DESC);
