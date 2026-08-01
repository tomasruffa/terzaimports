'use client'

import { useState } from 'react'
import Image from 'next/image'
import { isAnimatedAsset } from '@/lib/media'

type Props = {
  images: string[]
  productName: string
}

function GalleryImage({ src, alt, className, priority }: { src: string; alt: string; className: string; priority?: boolean }) {
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
      sizes="(max-width: 768px) 100vw, 55vw"
      priority={priority}
    />
  )
}

export default function ProductGallery({ images, productName }: Props) {
  const [active, setActive] = useState(0)
  const current = images[active] ?? images[0]

  if (!current) {
    return (
      <div className="flex aspect-[4/5] w-full items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
        Sin imagen
      </div>
    )
  }

  const mainClass = 'object-contain object-center p-4 h-full w-full'

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-neutral-50 shadow-lg md:aspect-square md:min-h-[min(70vh,720px)]">
        {isAnimatedAsset(current) ? (
          <GalleryImage src={current} alt={productName} className={mainClass} priority />
        ) : (
          <div className="relative h-full w-full">
            <GalleryImage src={current} alt={productName} className={mainClass} priority />
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                i === active ? 'border-terza-blue ring-2 ring-terza-blue/30' : 'border-gray-200 opacity-80 hover:opacity-100'
              }`}
            >
              {isAnimatedAsset(src) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="" className="h-full w-full object-contain bg-neutral-50 p-1" />
              ) : (
                <Image src={src} alt="" fill className="object-contain bg-neutral-950 p-1" sizes="80px" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
