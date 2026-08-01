/** Catálogo fijo de la landing (no depende de la API / Supabase). */

export interface LandingProduct {
  id: string
  name: string
  description: string
  sale_price: number
  stock_quantity: number
  image_url: string
  images?: string[]
  youtubeId?: string
  highlights?: string[]
}

export const LANDING_PRODUCTS: LandingProduct[] = [
  {
    id: 'rb-meta-polarized',
    name: 'Ray-Ban Wayfarer Polarized',
    description:
      'Ray-Ban Wayfarer con lentes polarizadas y tecnología Meta: cámara integrada, audio de apertura y Meta AI. Ideales para exteriores sin reflejos. Grabá video en primera persona, escuchá música y atendé llamadas sin sacar el teléfono.',
    sale_price: 0,
    stock_quantity: 1,
    image_url: '/products/rayban-meta-polarized/03-front.webp',
    images: [
      '/products/rayban-meta-polarized/03-front.webp',
      '/products/rayban-meta-polarized/01-angle.webp',
      '/products/rayban-meta-polarized/04-side.webp',
      '/products/rayban-meta-polarized/05-rear.webp',
      '/products/rayban-meta-polarized/02-lifestyle-grid.webp',
      '/products/rayban-meta-polarized/06-packaging.webp',
    ],
  },
  {
    id: 'rb-meta-transition',
    name: 'Ray-Ban Wayfarer Transition',
    description:
      'Ray-Ban Wayfarer con lentes Transition que se adaptan a la luz. Smart glasses con captura, llamadas manos libres y asistente Meta AI. Del interior al exterior con una sola montura.',
    sale_price: 0,
    stock_quantity: 1,
    image_url: '/products/rayban-meta-transition/01-transition.webp',
    images: [
      '/products/rayban-meta-transition/01-transition.webp',
      '/products/rayban-meta-transition/02-angle.webp',
      '/products/rayban-meta-transition/03-front.webp',
      '/products/rayban-meta-transition/04-side.webp',
      '/products/rayban-meta-transition/05-rear.webp',
      '/products/rayban-meta-polarized/03-front.webp',
      '/products/rayban-meta-polarized/01-angle.webp',
      '/products/rayban-meta-polarized/04-side.webp',
      '/products/rayban-meta-polarized/05-rear.webp',
      '/products/rayban-meta-polarized/02-lifestyle-grid.webp',
    ],
  },
  {
    id: 'oakley-meta-vanguard',
    name: 'Oakley Meta Vanguard',
    description:
      'Oakley Meta Vanguard con lentes Prizm, cámara integrada y app Meta para capturar, escuchar y controlar todo desde el celular. Diseño deportivo para outdoor, acción y creación de contenido en movimiento.',
    sale_price: 0,
    stock_quantity: 1,
    image_url: '/products/oakley-vanguard/01-front.png',
    images: [
      '/products/oakley-vanguard/01-front.png',
      '/products/oakley-vanguard/02-side.png',
      '/products/oakley-vanguard/03-lifestyle.png',
      '/products/oakley-vanguard/04-packaging.png',
      '/products/oakley-vanguard/05-app.png',
    ],
  },
  {
    id: 'kylie-jenner-meta',
    name: 'Kylie Jenner Meta',
    description:
      'Meta Starfire Kylie Edition: smart glasses con diseño exclusivo, cámara integrada, audio de apertura y Meta AI. Incluye estuche de carga y experiencia completa en la app Meta.',
    sale_price: 0,
    stock_quantity: 1,
    image_url: '/products/kylie-jenner-meta/01-front.png',
    images: [
      '/products/kylie-jenner-meta/01-front.png',
      '/products/kylie-jenner-meta/02-side.png',
      '/products/kylie-jenner-meta/03-starfire.png',
      '/products/kylie-jenner-meta/04-rear.png',
      '/products/kylie-jenner-meta/05-lifestyle.webp',
      '/products/kylie-jenner-meta/06-case.webp',
      '/products/kylie-jenner-meta/07-packaging.png',
    ],
  },
  {
    id: 'dji-mic-mini',
    name: 'DJI Mic Mini',
    description:
      'Micrófonos inalámbricos ultracompactos para creadores: audio nítido, transmisión estable y hasta 10 horas de batería. Kit con 2 transmisores, receptor, estuche de carga y accesorios. Compatible con DJI Osmo y cámaras vía adaptador.',
    sale_price: 0,
    stock_quantity: 1,
    image_url: '/products/dji-mic-mini/01-main.webp',
    youtubeId: 'iBgZJJ-NBTs',
    highlights: [
      'Pequeño, discreto y superligero',
      'Audio de alta calidad con transmisión estable',
      'Hasta 10 horas de batería',
      'Conexión directa con DJI Osmo',
      'Kit: 2 TX + 1 RX + estuche de carga',
    ],
    images: [
      '/products/dji-mic-mini/01-main.webp',
      '/products/dji-mic-mini/02-kit.webp',
      '/products/dji-mic-mini/03-case-open.webp',
      '/products/dji-mic-mini/04-case-angle.webp',
      '/products/dji-mic-mini/05-case-front.webp',
      '/products/dji-mic-mini/06-case-windscreen.webp',
      '/products/dji-mic-mini/07-transmitter.webp',
      '/products/dji-mic-mini/08-lifestyle.webp',
    ],
  },
]

export function getProductById(id: string): LandingProduct | undefined {
  return LANDING_PRODUCTS.find(p => p.id === id)
}

/** Todas las URLs de galería, sin duplicados. */
export function productGalleryImages(product: LandingProduct): string[] {
  const list = [
    product.image_url,
    ...(product.images ?? []),
  ].filter(Boolean)
  return [...new Set(list)]
}
