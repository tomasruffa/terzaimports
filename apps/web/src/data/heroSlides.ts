export type HeroSlide =
  | {
      id: string
      type: 'video'
      youtubeId: string
      eyebrow: string
      title: string
      subtitle: string
      primaryCta: { label: string; href: string }
      secondaryCta?: { label: string; href: string }
    }
  | {
      id: string
      type: 'image'
      src: string
      alt: string
      eyebrow: string
      title: string
      subtitle: string
      primaryCta: { label: string; href: string }
      secondaryCta?: { label: string; href: string }
    }

const WA_NUMBER = '5491170751477'

export function whatsAppHref(productName: string) {
  const text = encodeURIComponent(
    `Hola! Me interesa *${productName}* de terzaimports.com.ar. ¿Podrían darme precio y disponibilidad?`
  )
  return `https://wa.me/${WA_NUMBER}?text=${text}`
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'oakley-meta',
    type: 'video',
    youtubeId: 'AsQ_8_oQ188',
    eyebrow: 'Oakley × Meta',
    title: 'Oakley Meta Vanguard',
    subtitle: 'Diseño deportivo y resistencia para llevar Meta AI a cualquier aventura.',
    primaryCta: {
      label: 'Consultar Oakley Meta',
      href: whatsAppHref('Oakley Meta Vanguard'),
    },
    secondaryCta: { label: 'Ver catálogo', href: '#productos' },
  },
  {
    id: 'rayban-meta-transition',
    type: 'video',
    youtubeId: 'E1LW_MteTho',
    eyebrow: 'Ray-Ban × Meta',
    title: 'Ray-Ban Wayfarer Transition',
    subtitle:
      'Lentes que se adaptan a la luz. Cámara, audio y Meta AI en el clásico Wayfarer.',
    primaryCta: {
      label: 'Consultar Ray-Ban Transition',
      href: whatsAppHref('Ray-Ban Wayfarer Transition'),
    },
    secondaryCta: { label: 'Ver catálogo', href: '#productos' },
  },
  {
    id: 'kylie-meta',
    type: 'video',
    youtubeId: '2yYQO8exxaU',
    eyebrow: 'Edición limitada',
    title: 'Meta Glasses by Kylie',
    subtitle: 'Smart glasses con estilo premium y tecnología Meta AI integrada.',
    primaryCta: {
      label: 'Consultar por WhatsApp',
      href: whatsAppHref('Kylie Jenner Meta'),
    },
    secondaryCta: { label: 'Ver en catálogo', href: '#productos' },
  },
  {
    id: 'dji-mic-mini-video',
    type: 'video',
    youtubeId: 'iBgZJJ-NBTs',
    eyebrow: 'DJI · Audio para creadores',
    title: 'DJI Mic Mini',
    subtitle:
      'Micrófonos inalámbricos ultracompactos: sonido nítido para vlogs, reels y grabaciones en movimiento. Consultá precio y disponibilidad.',
    primaryCta: {
      label: 'Ver DJI Mic Mini',
      href: '/productos/dji-mic-mini',
    },
    secondaryCta: {
      label: 'Consultar por WhatsApp',
      href: whatsAppHref('DJI Mic Mini'),
    },
  },
]
