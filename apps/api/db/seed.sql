-- Terza Imports — productos iniciales

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
  'Ray-Ban Wayfarer Polarized',
  'RB-META-WF-POL',
  'Ray-Ban Wayfarer con lentes polarizadas y tecnología Meta: cámara integrada, audio de apertura y Meta AI.',
  'Lentes',
  0,
  0,
  1,
  1,
  'unidad',
  'Ray-Ban / Meta',
  'Estados Unidos',
  '/products/rayban-meta-polarized/03-front.webp',
  ARRAY[
    '/products/rayban-meta-polarized/03-front.webp',
    '/products/rayban-meta-polarized/01-angle.webp',
    '/products/rayban-meta-polarized/04-side.webp',
    '/products/rayban-meta-polarized/05-rear.webp',
    '/products/rayban-meta-polarized/02-lifestyle-grid.webp',
    '/products/rayban-meta-polarized/06-packaging.webp'
  ]::TEXT[],
  true
),
(
  'Ray-Ban Wayfarer Transition',
  'RB-META-WF-TRANS',
  'Ray-Ban Wayfarer con lentes Transition que se adaptan a la luz. Smart glasses con captura, llamadas manos libres y Meta AI.',
  'Lentes',
  0,
  0,
  1,
  1,
  'unidad',
  'Ray-Ban / Meta',
  'Estados Unidos',
  '/products/rayban-meta-transition/01-transition.webp',
  ARRAY[
    '/products/rayban-meta-transition/01-transition.webp',
    '/products/rayban-meta-transition/02-angle.webp',
    '/products/rayban-meta-transition/03-front.webp',
    '/products/rayban-meta-transition/04-side.webp',
    '/products/rayban-meta-transition/05-rear.webp'
  ]::TEXT[],
  true
),
(
  'Oakley Meta Vanguard',
  'OAK-META-VANGUARD',
  'Oakley Meta Vanguard con lentes Prizm, cámara integrada y app Meta para capturar, escuchar y controlar todo desde el celular.',
  'Lentes',
  0,
  0,
  1,
  1,
  'unidad',
  'Oakley / Meta',
  'Estados Unidos',
  '/products/oakley-vanguard/01-front.png',
  ARRAY[
    '/products/oakley-vanguard/01-front.png',
    '/products/oakley-vanguard/02-side.png',
    '/products/oakley-vanguard/03-lifestyle.png',
    '/products/oakley-vanguard/04-packaging.png',
    '/products/oakley-vanguard/05-app.png'
  ]::TEXT[],
  true
),
(
  'Kylie Jenner Meta',
  'KYLIE-META-STAR',
  'Meta Starfire Kylie Edition: smart glasses con diseño exclusivo, cámara integrada, audio de apertura y Meta AI.',
  'Lentes',
  0,
  0,
  1,
  1,
  'unidad',
  'Meta',
  'Estados Unidos',
  '/products/kylie-jenner-meta/01-front.png',
  ARRAY[
    '/products/kylie-jenner-meta/01-front.png',
    '/products/kylie-jenner-meta/02-side.png',
    '/products/kylie-jenner-meta/03-starfire.png',
    '/products/kylie-jenner-meta/04-rear.png',
    '/products/kylie-jenner-meta/05-lifestyle.webp',
    '/products/kylie-jenner-meta/06-case.webp',
    '/products/kylie-jenner-meta/07-packaging.png'
  ]::TEXT[],
  true
),
(
  'DJI Mic Mini',
  'DJI-MIC-MINI',
  'Micrófonos inalámbricos ultracompactos para creadores: audio nítido, transmisión estable y hasta 10 horas de batería.',
  'Audio',
  0,
  0,
  1,
  1,
  'unidad',
  'DJI',
  'China',
  '/products/dji-mic-mini/01-main.webp',
  ARRAY[
    '/products/dji-mic-mini/01-main.webp',
    '/products/dji-mic-mini/02-kit.webp',
    '/products/dji-mic-mini/03-case-open.webp',
    '/products/dji-mic-mini/04-case-angle.webp',
    '/products/dji-mic-mini/05-case-front.webp',
    '/products/dji-mic-mini/06-case-windscreen.webp',
    '/products/dji-mic-mini/07-transmitter.webp',
    '/products/dji-mic-mini/08-lifestyle.webp'
  ]::TEXT[],
  true
)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  supplier = EXCLUDED.supplier,
  origin_country = EXCLUDED.origin_country,
  image_url = EXCLUDED.image_url,
  images = EXCLUDED.images,
  active = EXCLUDED.active,
  updated_at = NOW();
