CREATE TABLE IF NOT EXISTS business_profile (
  id UUID PRIMARY KEY,
  business_name VARCHAR(150) NOT NULL,
  owner_name VARCHAR(150),
  phone VARCHAR(50),
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role_id UUID REFERENCES roles(id),
  employee_id UUID,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(50),
  position VARCHAR(100),
  shift_name VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY,
  device_name VARCHAR(150) NOT NULL,
  device_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'online',
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY,
  category_id UUID REFERENCES categories(id),
  name VARCHAR(150) NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  sku VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  item_name VARCHAR(150) NOT NULL,
  unit VARCHAR(50),
  quantity NUMERIC(12,2) DEFAULT 0,
  min_quantity NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_recipes (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  item_name VARCHAR(150) NOT NULL,
  quantity_required NUMERIC(12,2) NOT NULL,
  unit VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  device_id UUID REFERENCES devices(id),
  transaction_code VARCHAR(50) UNIQUE NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  subtotal NUMERIC(12,2),
  discount NUMERIC(12,2) DEFAULT 0,
  payment_method VARCHAR(50),
  status VARCHAR(30) DEFAULT 'pending_sync',
  idempotency_key VARCHAR(100) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transaction_items (
  id UUID PRIMARY KEY,
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_snapshot_name VARCHAR(150),
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY,
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  method VARCHAR(50),
  status VARCHAR(30) DEFAULT 'success',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY,
  employee_id UUID REFERENCES employees(id),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  status VARCHAR(30) DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY,
  employee_id UUID REFERENCES employees(id),
  shift_id UUID REFERENCES shifts(id),
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  status VARCHAR(30) DEFAULT 'present',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cash_sessions (
  id UUID PRIMARY KEY,
  shift_id UUID REFERENCES shifts(id),
  opening_balance NUMERIC(12,2) DEFAULT 0,
  closing_balance NUMERIC(12,2) DEFAULT 0,
  expected_balance NUMERIC(12,2) DEFAULT 0,
  difference NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cash_movements (
  id UUID PRIMARY KEY,
  cash_session_id UUID REFERENCES cash_sessions(id),
  movement_type VARCHAR(50) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY,
  category VARCHAR(100),
  amount NUMERIC(12,2) NOT NULL,
  note TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY,
  inventory_id UUID REFERENCES inventory(id),
  movement_type VARCHAR(50) NOT NULL,
  quantity NUMERIC(12,2) NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  device_id UUID REFERENCES devices(id),
  transaction_id UUID REFERENCES transactions(id),
  action_type VARCHAR(100) NOT NULL,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
