import Image from 'next/image'
import Link from 'next/link'

type TerzaIconProps = {
  size?: number
  className?: string
  priority?: boolean
}

/** Proporción real del ícono extraído (104×76). */
const ICON_WIDTH = 104
const ICON_HEIGHT = 76

export function TerzaIcon({ size = 32, className = '', priority }: TerzaIconProps) {
  const width = size
  const height = Math.round(size * (ICON_HEIGHT / ICON_WIDTH))

  return (
    <Image
      src="/logo/terza-icon.webp"
      alt=""
      width={width}
      height={height}
      className={className}
      priority={priority}
      aria-hidden
    />
  )
}

type TerzaLogoProps = {
  href?: string
  iconSize?: number
  showText?: boolean
  className?: string
  textClassName?: string
  onClick?: () => void
}

export function TerzaLogo({
  href = '/',
  iconSize = 32,
  showText = true,
  className = 'flex items-center gap-3 group',
  textClassName = 'text-white font-bold text-xl tracking-wider',
  onClick,
}: TerzaLogoProps) {
  const content = (
    <>
      <TerzaIcon size={iconSize} className="shrink-0" priority />
      {showText ? (
        <span className={textClassName}>
          TERZA{' '}
          <span className="text-terza-blue-bright font-light text-sm tracking-widest">IMPORTS</span>
        </span>
      ) : null}
    </>
  )

  if (href.startsWith('/')) {
    return (
      <Link href={href} className={className} onClick={onClick}>
        {content}
      </Link>
    )
  }

  return (
    <a href={href} className={className} onClick={onClick}>
      {content}
    </a>
  )
}
