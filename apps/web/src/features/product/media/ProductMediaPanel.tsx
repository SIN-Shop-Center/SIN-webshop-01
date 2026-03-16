'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Product } from '@/types'

type ProductMediaPanelProps = {
  product: Product
  discount: number | null
}

export function ProductMediaPanel({ product, discount }: ProductMediaPanelProps) {
  const images = useMemo(() => {
    if (product.images.length > 0) {
      return product.images
    }
    return ['/catalog/product-fallback.svg']
  }, [product.images])

  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    setActiveIndex(0)
  }, [product.id])

  const nextImage = () => {
    setActiveIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setActiveIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  return (
    <article className="space-y-3">
      <div className="group relative aspect-square overflow-hidden rounded-[2rem] border border-brand-border bg-brand-bg shadow-[0_22px_55px_rgba(10,10,10,0.1)]">
        <Image
          src={images[activeIndex]}
          alt={product.name}
          fill
          className="object-contain object-center p-6 transition-transform duration-500 group-hover:scale-[1.02]"
          priority
          sizes="(max-width: 1024px) 100vw, 55vw"
        />

        <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-4">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-brand-border bg-white/92 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-text-muted">
              Bilder
            </span>
            {(product.badges || []).slice(0, 1).map((badge) => (
              <span
                key={badge.id}
                className={[
                  'rounded-full px-3 py-1.5 text-xs font-semibold',
                  badge.tone === 'dark'
                    ? 'bg-black text-white'
                    : badge.tone === 'accent'
                      ? 'bg-amber-50 text-brand-text'
                      : 'border border-brand-border bg-white/92 text-brand-text',
                ].join(' ')}
              >
                {badge.label}
              </span>
            ))}
          </div>
          {discount ? <span className="rounded-full bg-black px-3 py-1.5 text-xs font-semibold text-white">-{discount}%</span> : null}
        </div>

        {images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={prevImage}
              aria-label="Vorheriges Bild"
              className="absolute left-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/90 text-brand-text opacity-100 transition-all hover:bg-white md:opacity-0 md:group-hover:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={nextImage}
              aria-label="Nächstes Bild"
              className="absolute right-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/90 text-brand-text opacity-100 transition-all hover:bg-white md:opacity-0 md:group-hover:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        ) : null}

        {images.length > 1 ? (
          <div className="absolute bottom-4 right-4 rounded-full border border-white/20 bg-black/65 px-3 py-1 text-[11px] font-semibold text-white">
            {activeIndex + 1} / {images.length}
          </div>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div className="grid grid-cols-4 gap-2">
          {images.slice(0, 8).map((image, index) => {
            const selected = activeIndex === index
            return (
              <button
                key={`${product.id}-thumb-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={[
                  'relative aspect-square min-h-[2.75rem] min-w-[2.75rem] overflow-hidden rounded-2xl border transition-all',
                  selected ? 'border-black shadow-[0_10px_24px_rgba(10,10,10,0.12)]' : 'border-brand-border opacity-75 hover:opacity-100',
                ].join(' ')}
                aria-label={`${product.name} Bild ${index + 1}`}
              >
                <Image
                  src={image}
                  alt={`${product.name} Thumbnail ${index + 1}`}
                  fill
                  className="object-contain bg-brand-bg p-1.5"
                  sizes="(max-width: 1024px) 25vw, 12vw"
                />
              </button>
            )
          })}
        </div>
      ) : null}
    </article>
  )
}
