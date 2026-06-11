// Purpose: Product image gallery — mobile-first: swipe, scrollable thumbs,
// keyboard nav, image counter (Step 10 — UX)
// Docs: PLAN-VERKAUFSFAEHIG.md

'use client'

import Image from 'next/image'
import { useCallback, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { ArrowLeftIcon, ArrowRightIcon } from './icons'

interface ProductGalleryProps {
  title: string
  imageUrl: string
  imageGallery?: string[]
}

export function ProductGallery({
  title,
  imageUrl,
  imageGallery,
}: ProductGalleryProps) {
  const all = Array.from(
    new Set([imageUrl, ...(imageGallery ?? []).filter(Boolean)]),
  )
  const [activeIndex, setActiveIndex] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const active = all[activeIndex] ?? imageUrl
  const hasMultiple = all.length > 1

  const goTo = useCallback(
    (index: number) => {
      setActiveIndex((index + all.length) % all.length)
    },
    [all.length],
  )

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      goTo(activeIndex - 1)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      goTo(activeIndex + 1)
    }
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) < 40) return
    goTo(delta < 0 ? activeIndex + 1 : activeIndex - 1)
  }

  if (all.length === 0) return null

  return (
    <div
      className="flex flex-col gap-3"
      onKeyDown={hasMultiple ? handleKeyDown : undefined}
    >
      <div
        className="group relative aspect-square touch-pan-y overflow-hidden rounded-lg bg-muted"
        onTouchStart={hasMultiple ? handleTouchStart : undefined}
        onTouchEnd={hasMultiple ? handleTouchEnd : undefined}
      >
        <Image
          src={active}
          alt={`${title} — Bild ${activeIndex + 1} von ${all.length}`}
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={() => goTo(activeIndex - 1)}
              aria-label="Vorheriges Bild"
              className="absolute left-2 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow-sm backdrop-blur-sm transition-opacity hover:bg-background sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
            >
              <ArrowLeftIcon className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => goTo(activeIndex + 1)}
              aria-label="Nächstes Bild"
              className="absolute right-2 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow-sm backdrop-blur-sm transition-opacity hover:bg-background sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
            >
              <ArrowRightIcon className="size-4" aria-hidden />
            </button>
            <span
              aria-hidden
              className="absolute bottom-2 right-2 rounded-full bg-background/80 px-2 py-0.5 text-xs font-medium tabular-nums backdrop-blur-sm"
            >
              {activeIndex + 1} / {all.length}
            </span>
          </>
        )}
      </div>
      {hasMultiple && (
        <div
          role="group"
          aria-label="Produktbilder"
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        >
          {all.map((url, i) => (
            <button
              key={url + i}
              type="button"
              aria-label={`Bild ${i + 1} anzeigen`}
              aria-pressed={i === activeIndex}
              onClick={() => setActiveIndex(i)}
              className={cn(
                'relative size-16 shrink-0 overflow-hidden rounded-md border-2 transition-colors',
                i === activeIndex
                  ? 'border-primary'
                  : 'border-border hover:border-foreground/40',
              )}
            >
              <Image
                src={url}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
