// Purpose: Product image gallery with thumbnails (Step 10 — UX)
// Docs: PLAN-VERKAUFSFAEHIG.md

'use client'

import Image from 'next/image'
import { useState } from 'react'
import { cn } from '@/lib/cn' // we'll add a tiny cn helper

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
  // Dedupe: the first slot is always imageUrl, the rest come from imageGallery
  const all = Array.from(
    new Set([imageUrl, ...(imageGallery ?? []).filter(Boolean)]),
  )
  const [activeIndex, setActiveIndex] = useState(0)
  const active = all[activeIndex] ?? imageUrl

  if (all.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
        <Image
          src={active}
          alt={title}
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      {all.length > 1 && (
        <div
          role="group"
          aria-label="Produktbilder"
          className="grid grid-cols-5 gap-2"
        >
          {all.map((url, i) => (
            <button
              key={url + i}
              type="button"
              aria-label={`Bild ${i + 1} anzeigen`}
              aria-pressed={i === activeIndex}
              onClick={() => setActiveIndex(i)}
              className={cn(
                'relative aspect-square overflow-hidden rounded-md border-2 transition-colors',
                i === activeIndex
                  ? 'border-primary'
                  : 'border-border hover:border-foreground/40',
              )}
            >
              <Image
                src={url}
                alt=""
                fill
                sizes="(min-width: 1024px) 10vw, 20vw"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
