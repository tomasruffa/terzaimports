-- Terza Imports — Railway PostgreSQL schema

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  purchase_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  sale_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 5,
  unit VARCHAR(50) NOT NULL DEFAULT 'unidad',
  supplier VARCHAR(255),
  origin_country VARCHAR(100),
  image_url TEXT,
  images TEXT[] DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('in', 'out', 'adjustment')),
  quantity INTEGER NOT NULL,
  reason TEXT,
  reference VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category VARCHAR(100) NOT NULL,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50),
  receipt_url TEXT,
  notes TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meli_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meli_user_id BIGINT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_meli_tokens_user ON meli_tokens(meli_user_id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS expenses_updated_at ON expenses;
CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS meli_tokens_updated_at ON meli_tokens;
CREATE TRIGGER meli_tokens_updated_at
  BEFORE UPDATE ON meli_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Mercado Libre sync (idempotente en re-runs de migrate)
ALTER TABLE products ADD COLUMN IF NOT EXISTS meli_item_id VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS meli_permalink TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS meli_last_synced_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_meli_item_id
  ON products(meli_item_id) WHERE meli_item_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS meli_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id VARCHAR(255) UNIQUE NOT NULL,
  topic VARCHAR(100) NOT NULL,
  resource TEXT,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meli_notifications_topic ON meli_notifications(topic);

-- Mercado Libre — datos y métricas sincronizados desde la API
CREATE TABLE IF NOT EXISTS meli_accounts (
  meli_user_id BIGINT PRIMARY KEY,
  nickname VARCHAR(255),
  email VARCHAR(255),
  site_id VARCHAR(10),
  permalink TEXT,
  reputation_level VARCHAR(50),
  power_seller_status VARCHAR(50),
  transactions_total INTEGER DEFAULT 0,
  transactions_completed INTEGER DEFAULT 0,
  transactions_canceled INTEGER DEFAULT 0,
  ratings_positive INTEGER DEFAULT 0,
  ratings_negative INTEGER DEFAULT 0,
  ratings_neutral INTEGER DEFAULT 0,
  raw JSONB,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meli_items (
  meli_item_id VARCHAR(50) PRIMARY KEY,
  meli_user_id BIGINT NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  title VARCHAR(500) NOT NULL,
  category_id VARCHAR(50),
  price DECIMAL(12, 2),
  currency_id VARCHAR(10),
  available_quantity INTEGER DEFAULT 0,
  sold_quantity INTEGER DEFAULT 0,
  status VARCHAR(50),
  listing_type_id VARCHAR(50),
  item_condition VARCHAR(50),
  permalink TEXT,
  thumbnail TEXT,
  health DECIMAL(5, 2),
  visits_total INTEGER DEFAULT 0,
  visits_last_30d INTEGER DEFAULT 0,
  raw JSONB,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meli_orders (
  meli_order_id BIGINT PRIMARY KEY,
  meli_user_id BIGINT NOT NULL,
  status VARCHAR(50),
  status_detail VARCHAR(100),
  buyer_id BIGINT,
  buyer_nickname VARCHAR(255),
  total_amount DECIMAL(12, 2),
  paid_amount DECIMAL(12, 2),
  currency_id VARCHAR(10),
  shipping_status VARCHAR(50),
  date_created TIMESTAMPTZ,
  date_closed TIMESTAMPTZ,
  raw JSONB,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meli_order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meli_order_id BIGINT NOT NULL REFERENCES meli_orders(meli_order_id) ON DELETE CASCADE,
  meli_item_id VARCHAR(50),
  title VARCHAR(500),
  quantity INTEGER,
  unit_price DECIMAL(12, 2),
  UNIQUE (meli_order_id, meli_item_id, title)
);

CREATE TABLE IF NOT EXISTS meli_questions (
  meli_question_id BIGINT PRIMARY KEY,
  meli_user_id BIGINT NOT NULL,
  meli_item_id VARCHAR(50),
  text TEXT,
  status VARCHAR(50),
  answer_text TEXT,
  from_user_id BIGINT,
  date_created TIMESTAMPTZ,
  raw JSONB,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meli_payments (
  meli_payment_id BIGINT PRIMARY KEY,
  meli_user_id BIGINT,
  meli_order_id BIGINT,
  status VARCHAR(50),
  status_detail VARCHAR(100),
  transaction_amount DECIMAL(12, 2),
  currency_id VARCHAR(10),
  date_created TIMESTAMPTZ,
  raw JSONB,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meli_metrics_daily (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meli_user_id BIGINT NOT NULL,
  metric_date DATE NOT NULL,
  visits_total INTEGER DEFAULT 0,
  orders_count INTEGER DEFAULT 0,
  orders_paid_count INTEGER DEFAULT 0,
  gross_sales DECIMAL(14, 2) DEFAULT 0,
  active_items INTEGER DEFAULT 0,
  paused_items INTEGER DEFAULT 0,
  unanswered_questions INTEGER DEFAULT 0,
  raw JSONB,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (meli_user_id, metric_date)
);

CREATE TABLE IF NOT EXISTS meli_sync_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meli_user_id BIGINT,
  sync_type VARCHAR(50) NOT NULL DEFAULT 'full',
  status VARCHAR(20) NOT NULL DEFAULT 'running',
  summary JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_meli_items_user ON meli_items(meli_user_id);
CREATE INDEX IF NOT EXISTS idx_meli_items_status ON meli_items(status);
CREATE INDEX IF NOT EXISTS idx_meli_orders_user ON meli_orders(meli_user_id);
CREATE INDEX IF NOT EXISTS idx_meli_orders_date ON meli_orders(date_created);
CREATE INDEX IF NOT EXISTS idx_meli_orders_status ON meli_orders(status);
CREATE INDEX IF NOT EXISTS idx_meli_questions_user ON meli_questions(meli_user_id);
CREATE INDEX IF NOT EXISTS idx_meli_questions_status ON meli_questions(status);
CREATE INDEX IF NOT EXISTS idx_meli_metrics_user_date ON meli_metrics_daily(meli_user_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_meli_sync_runs_started ON meli_sync_runs(started_at DESC);

-- Ventas consolidadas (todos los canales)
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel VARCHAR(30) NOT NULL CHECK (channel IN ('mercadolibre', 'whatsapp', 'facebook', 'presencial')),
  external_id VARCHAR(255),
  customer_name VARCHAR(255),
  customer_contact VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'completed',
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  currency_id VARCHAR(10) NOT NULL DEFAULT 'ARS',
  notes TEXT,
  sale_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_channel_external
  ON sales(channel, external_id) WHERE external_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  description VARCHAR(500),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  line_total DECIMAL(12, 2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sales_channel ON sales(channel);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);

ALTER TABLE meli_orders ADD COLUMN IF NOT EXISTS sale_id UUID REFERENCES sales(id) ON DELETE SET NULL;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS sale_id UUID REFERENCES sales(id) ON DELETE SET NULL;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS channel VARCHAR(30);

DROP TRIGGER IF EXISTS sales_updated_at ON sales;
CREATE TRIGGER sales_updated_at
  BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
