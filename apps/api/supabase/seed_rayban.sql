-- ============================================================
-- Terza Imports — Seed: RayBan Meta Wayfarer GEN 2
-- ============================================================
-- Ejecutar en el SQL Editor de Supabase o con psql.
--
-- IMÁGENES: subí los archivos al Supabase Storage Bucket
-- llamado "products" y luego reemplazá las URLs en el array
-- `images` de cada producto. Ejemplo de URL:
--   https://<project>.supabase.co/storage/v1/object/public/products/rayban-meta-wayfarer-transition-1.jpg
-- ============================================================

-- 1. Agregar columna images (array de URLs) si no existe
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- ============================================================
-- 2. Insertar / actualizar productos
-- ============================================================

INSERT INTO products (
  name,
  sku,
  description,
  category,
  purchase_price,
  sale_price,
  stock_quantity,
  min_stock,
  unit,
  supplier,
  origin_country,
  image_url,
  images,
  active
) VALUES
(
  'Ray-Ban Meta Wayfarer GEN 2 — Transition',
  'RB-META-WF-G2-TRANS',
  'Lentes inteligentes Ray-Ban Meta de segunda generación con lentes Transition que se oscurecen automáticamente ante la luz solar. Incluye altavoces de apertura acústica integrados, 5 micrófonos, cámara 12 MP, Meta AI y hasta 8 horas de batería. Conectividad Bluetooth 5.3. Compatible con iOS y Android.',
  'Lentes',
  0,         -- Completar con precio de costo
  0,         -- Completar con precio de venta
  0,         -- Actualizar con stock real
  2,
  'unidad',
  'Ray-Ban / Meta',
  'Estados Unidos',
  -- Reemplazá con la URL real de Supabase Storage:
  NULL,
  -- Array de imágenes (URL principal primero, luego adicionales):
  ARRAY[
    -- 'https://<project>.supabase.co/storage/v1/object/public/products/rb-meta-wf-g2-trans-1.jpg',
    -- 'https://<project>.supabase.co/storage/v1/object/public/products/rb-meta-wf-g2-trans-2.jpg',
    -- 'https://<project>.supabase.co/storage/v1/object/public/products/rb-meta-wf-g2-trans-3.jpg'
  ]::TEXT[],
  true
),
(
  'Ray-Ban Meta Wayfarer GEN 2 — Polarized',
  'RB-META-WF-G2-POL',
  'Lentes inteligentes Ray-Ban Meta de segunda generación con lentes polarizadas que eliminan los reflejos y mejoran la visión en exteriores. Incluye altavoces de apertura acústica, 5 micrófonos, cámara 12 MP, Meta AI y hasta 8 horas de batería. Conectividad Bluetooth 5.3. Compatible con iOS y Android.',
  'Lentes',
  0,         -- Completar con precio de costo
  0,         -- Completar con precio de venta
  0,         -- Actualizar con stock real
  2,
  'unidad',
  'Ray-Ban / Meta',
  'Estados Unidos',
  NULL,
  ARRAY[
    -- 'https://<project>.supabase.co/storage/v1/object/public/products/rb-meta-wf-g2-pol-1.jpg',
    -- 'https://<project>.supabase.co/storage/v1/object/public/products/rb-meta-wf-g2-pol-2.jpg',
    -- 'https://<project>.supabase.co/storage/v1/object/public/products/rb-meta-wf-g2-pol-3.jpg'
  ]::TEXT[],
  true
)
ON CONFLICT (sku) DO UPDATE SET
  name          = EXCLUDED.name,
  description   = EXCLUDED.description,
  category      = EXCLUDED.category,
  supplier      = EXCLUDED.supplier,
  origin_country = EXCLUDED.origin_country,
  active        = EXCLUDED.active,
  updated_at    = NOW();

-- ============================================================
-- 3. Actualizar precios y stock después de confirmar los valores
-- ============================================================
-- Ejemplo:
-- UPDATE products SET purchase_price = 180, sale_price = 320, stock_quantity = 5
--   WHERE sku = 'RB-META-WF-G2-TRANS';
--
-- UPDATE products SET purchase_price = 195, sale_price = 340, stock_quantity = 3
--   WHERE sku = 'RB-META-WF-G2-POL';

-- ============================================================
-- 4. Actualizar imágenes una vez subidas a Supabase Storage
-- ============================================================
-- UPDATE products SET
--   image_url = 'https://<project>.supabase.co/storage/v1/object/public/products/rb-meta-wf-g2-trans-1.jpg',
--   images = ARRAY[
--     'https://<project>.supabase.co/storage/v1/object/public/products/rb-meta-wf-g2-trans-1.jpg',
--     'https://<project>.supabase.co/storage/v1/object/public/products/rb-meta-wf-g2-trans-2.jpg',
--     'https://<project>.supabase.co/storage/v1/object/public/products/rb-meta-wf-g2-trans-3.jpg'
--   ]
--   WHERE sku = 'RB-META-WF-G2-TRANS';
--
-- UPDATE products SET
--   image_url = 'https://<project>.supabase.co/storage/v1/object/public/products/rb-meta-wf-g2-pol-1.jpg',
--   images = ARRAY[
--     'https://<project>.supabase.co/storage/v1/object/public/products/rb-meta-wf-g2-pol-1.jpg',
--     'https://<project>.supabase.co/storage/v1/object/public/products/rb-meta-wf-g2-pol-2.jpg',
--     'https://<project>.supabase.co/storage/v1/object/public/products/rb-meta-wf-g2-pol-3.jpg'
--   ]
--   WHERE sku = 'RB-META-WF-G2-POL';

-- Verificar resultado:
SELECT id, name, sku, sale_price, stock_quantity, images, active
FROM products
WHERE sku IN ('RB-META-WF-G2-TRANS', 'RB-META-WF-G2-POL');
