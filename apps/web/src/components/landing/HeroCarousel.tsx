'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { ArrowRight, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react'
import { HERO_SLIDES, type HeroSlide } from '@/data/heroSlides'

const AUTO_ADVANCE_MS = 9000

function youtubeEmbedSrc(videoId: string) {
  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    loop: '1',
    playlist: videoId,
    controls: '0',
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    enablejsapi: '1',
    fs: '0',
    disablekb: '1',
    iv_load_policy: '3',
    cc_load_policy: '0',
    autohide: '1',
  })
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params}`
}

function SlideMedia({ slide, isActive }: { slide: HeroSlide; isActive: boolean }) {
  if (slide.type === 'video') {
    return (
      <div className="absolute inset-0 overflow-hidden bg-black">
        {isActive && (
          <iframe
            title={slide.title}
            src={youtubeEmbedSrc(slide.youtubeId)}
            className="absolute top-1/2 left-1/2 h-[130%] w-[230%] max-w-none -translate-x-1/2 -translate-y-[48%] pointer-events-none border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            tabIndex={-1}
          />
        )}
        {/* Oculta logo y controles residuales de YouTube en los bordes */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-16 bg-gradient-to-t from-black/80 to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute right-0 bottom-0 z-[1] h-20 w-28 bg-gradient-to-tl from-black/90 to-transparent"
          aria-hidden
        />
      </div>
    )
  }

  return (
    <Image
      src={slide.src}
      alt={slide.alt}
      fill
      priority={slide.id === 'kylie-meta'}
      className="object-cover object-center"
      sizes="100vw"
    />
  )
}

function SlideContent({ slide }: { slide: HeroSlide }) {
  const secondary = slide.secondaryCta
  const isWa = slide.primaryCta.href.startsWith('https://wa.me')

  return (
    <div className="relative z-20 flex h-full flex-col justify-end px-4 pb-28 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-terza-blue-bright">
          {slide.eyebrow}
        </p>
        <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
          {slide.title}
        </h1>
        <p className="mt-4 max-w-xl text-base text-white/85 sm:text-lg">{slide.subtitle}</p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <a
            href={slide.primaryCta.href}
            target={isWa ? '_blank' : undefined}
            rel={isWa ? 'noopener noreferrer' : undefined}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-semibold shadow-lg transition-all ${
              isWa
                ? 'bg-green-600 text-white hover:bg-green-500'
                : 'btn-primary'
            }`}
          >
            {isWa ? <MessageCircle size={18} /> : null}
            {slide.primaryCta.label}
            {!isWa ? <ArrowRight size={18} /> : null}
          </a>
          {secondary ? (
            <a
              href={secondary.href}
              className="btn-secondary inline-flex items-center justify-center gap-2 rounded-xl border-white/40 text-white hover:bg-white/10"
            >
              {secondary.label}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default function HeroCarousel() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = HERO_SLIDES.length

  const goTo = useCallback(
    (next: number) => {
      setIndex(((next % count) + count) % count)
    },
    [count]
  )

  useEffect(() => {
    if (paused) return
    const timer = window.setInterval(() => {
      setIndex(i => (i + 1) % count)
    }, AUTO_ADVANCE_MS)
    return () => window.clearInterval(timer)
  }, [paused, count])

  return (
    <section
      id="hero"
      className="relative h-[100svh] min-h-[600px] w-full overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Destacados Terza Imports"
    >
      {HERO_SLIDES.map((slide, i) => {
        const isActive = i === index
        return (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ease-out ${
              isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
            aria-hidden={!isActive}
          >
            <SlideMedia slide={slide} isActive={isActive} />
            <div className="absolute inset-0 bg-gradient-to-t from-terza-navy via-terza-navy/50 to-terza-navy/30" />
            <div className="absolute inset-0 bg-black/25" />
            {isActive && <SlideContent slide={slide} />}
          </div>
        )
      })}

      <div className="pointer-events-none absolute inset-x-0 bottom-8 z-30 flex flex-col items-center gap-4">
        <div className="pointer-events-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-black/40 text-white backdrop-blur hover:bg-black/60"
            aria-label="Slide anterior"
          >
            <ChevronLeft size={22} />
          </button>

          <div className="flex gap-2">
            {HERO_SLIDES.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => goTo(i)}
                className={`h-2 rounded-full transition-all ${
                  i === index ? 'w-8 bg-terza-blue-bright' : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Ir a slide: ${slide.title}`}
                aria-current={i === index ? true : undefined}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => goTo(index + 1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-black/40 text-white backdrop-blur hover:bg-black/60"
            aria-label="Slide siguiente"
          >
            <ChevronRight size={22} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-1 animate-bounce">
          <span className="text-xs uppercase tracking-widest text-white/50">Deslizá</span>
          <div className="h-8 w-0.5 rounded-full bg-white/40" />
        </div>
      </div>
    </section>
  )
}
