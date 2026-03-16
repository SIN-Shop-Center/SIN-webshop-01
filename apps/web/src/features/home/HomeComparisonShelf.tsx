'use client'

import Link from '@/components/ui/Link'
import { ArrowRight, Check, Star, Truck } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { Product } from '@/types'

type HomeComparisonShelfProps = {
  products: Product[]
}

export function HomeComparisonShelf({ products }: HomeComparisonShelfProps) {
  if (products.length === 0) {
    return null
  }

  return (
    <section className="shell-container mt-14">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="section-eyebrow">Schneller vergleichen</p>
          <h2 className="mt-2 text-3xl md:text-4xl">Drei starke Optionen, sauber nebeneinander.</h2>
          <p className="mt-3 text-sm leading-7 text-brand-text-muted">
            Apple führt über Vergleich, Amazon über Entscheidungsdichte. Diese Fläche bringt beides in einen
            ruhigen Zwischenstep vor dem Klick.
          </p>
        </div>
        <Link href="/products?badge=bestseller" className="cta-secondary inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-150">
          Alle Favoriten ansehen
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {products.map((product) => (
          <article key={product.id} className="rounded-[1.7rem] border border-brand-border bg-white p-5 shadow-[0_10px_26px_rgba(18,18,18,0.05)]">
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-brand-text-muted">
              {(product.badges?.[0]?.label || 'Vergleichskandidat').toUpperCase()}
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-brand-text">{product.name}</h3>
            <div className="mt-4 flex items-center gap-3 text-sm text-brand-text-muted">
              <span className="inline-flex items-center gap-1">
                <Star className="h-4 w-4 fill-[#d2a44d] text-[#d2a44d]" />
                {(product.rating || 0).toFixed(1)} ({product.reviewCount || 0})
              </span>
              <span className="inline-flex items-center gap-1">
                <Truck className="h-4 w-4 text-brand-text" />
                {product.deliveryEstimate}
              </span>
            </div>
            <p className="mt-4 text-3xl font-semibold text-brand-text">{formatPrice(product.price)}</p>
            <div className="mt-5 space-y-2">
              {(product.highlights || []).slice(0, 3).map((entry) => (
                <p key={entry} className="inline-flex items-start gap-2 text-sm leading-6 text-brand-text">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-brand-success" />
                  {entry}
                </p>
              ))}
            </div>
            <Link
              href={`/products/${encodeURIComponent(product.id)}`}
              prefetch={false}
              className="mt-6 inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-full border border-black bg-black px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
            >
              Produkt ansehen
              <ArrowRight className="h-4 w-4" />
            </Link>
          </article>
        ))}
      </div>
    </section>
  )
}
