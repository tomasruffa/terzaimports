-- Terza Imports - Schema Supabase

-- Tabla de productos
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  purchase_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  sale_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 5,
  unit VARCHAR(50) NOT NULL DEFAULT 'unidad',
  supplier VARCHAR(255),
  origin_country VARCHAR(100),
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de movimientos de stock
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('in', 'out', 'adjustment')),
  quantity INTEGER NOT NULL,
  reason TEXT,
  reference VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Tabla de gastos operacionales
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category VARCHAR(100) NOT NULL,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50),
  receipt_url TEXT,
  notes TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para expenses
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_created ON expenses(created_at);

-- Trigger para updated_at en expenses
CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Datos de ejemplo
INSERT INTO products (name, sku, description, category, purchase_price, sale_price, stock_quantity, min_stock, unit, supplier, origin_country) VALUES
('Cable USB-C Premium 2m', 'CAB-USBC-2M', 'Cable de carga rápida y datos USB-C de 2 metros', 'Cables', 3.50, 12.99, 150, 20, 'unidad', 'TechSupply Co.', 'China'),
('Auriculares Bluetooth TWS', 'AUR-BT-TWS01', 'Auriculares inalámbricos con cancelación de ruido', 'Audio', 18.00, 59.99, 45, 10, 'unidad', 'AudioMax Ltd.', 'China'),
('Cargador Rápido 65W GaN', 'CAR-GAN-65W', 'Cargador compacto 65W con tecnología GaN', 'Cargadores', 12.00, 34.99, 80, 15, 'unidad', 'PowerTech', 'China'),
('Soporte Celular Auto Magnético', 'SOP-AUTO-MAG', 'Soporte magnético para ventila de auto', 'Accesorios', 4.50, 16.99, 200, 30, 'unidad', 'MountPro', 'China'),
('Funda Notebook 15"', 'FUN-NB-15', 'Funda impermeable con compartimentos para notebook 15 pulgadas', 'Bolsos', 8.00, 24.99, 60, 10, 'unidad', 'BagWorld', 'Vietnam')
ON CONFLICT (sku) DO NOTHING;
