'use client'

import { useState } from 'react'
import Image from 'next/image'
import { isAnimatedAsset } from '@/lib/media'

type Props = {
  images: string[]
  productName: string
}

function GalleryImage({
  src,
  alt,
  className,
  priority,
}: {
  src: string
  alt: string
  className: string
  priority?: boolean
}) {
  if (isAnimatedAsset(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={className} />
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={className}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 50vw"
      priority={priority}
    />
  )
}

export default function ProductGallery({ images, productName }: Props) {
  const [active, setActive] = useState(0)
  const current = images[active] ?? images[0]

  if (!current) {
    return (
      <div className="flex aspect-square w-full max-w-full items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
        Sin imagen
      </div>
    )
  }

  const mainClass = 'h-full w-full object-contain object-center p-3 sm:p-4'

  return (
    <div className="flex min-w-0 w-full max-w-full flex-col gap-3 sm:gap-4">
      <div className="relative mx-auto aspect-square w-full max-w-full overflow-hidden rounded-2xl bg-neutral-50 shadow-lg sm:max-h-[min(72vh,640px)] sm:aspect-[4/3] lg:aspect-square lg:max-h-[min(70vh,720px)]">
        <div className="relative h-full w-full">
          <GalleryImage src={current} alt={productName} className={mainClass} priority />
        </div>
      </div>

      {images.length > 1 && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 snap-x snap-mandatory sm:mx-0 sm:gap-3 sm:px-0">
          {images.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              className={`relative h-16 w-16 shrink-0 snap-start overflow-hidden rounded-xl border-2 transition-all sm:h-20 sm:w-20 ${
                i === active
                  ? 'border-terza-blue ring-2 ring-terza-blue/30'
                  : 'border-gray-200 opacity-80 hover:opacity-100'
              }`}
            >
              {isAnimatedAsset(src) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="" className="h-full w-full bg-neutral-50 object-contain p-1" />
              ) : (
                <Image
                  src={src}
                  alt=""
                  fill
                  className="bg-neutral-50 object-contain p-1"
                  sizes="80px"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
