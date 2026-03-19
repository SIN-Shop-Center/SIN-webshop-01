import { BadgeCheck, PackageCheck, RotateCcw, Truck } from 'lucide-react'
import type { CustomerSegment } from '@simone/contracts'
import { FREE_SHIPPING_THRESHOLD } from '@/features/checkout'
import { formatPrice } from '@/lib/utils'
import type { Product } from '@/types'

type ProductPricingBlockProps = {
  product: Product
  segment: CustomerSegment
}

export function ProductPricingBlock({ product, segment }: ProductPricingBlockProps) {
  const hasComparePrice = typeof product.compareAtPrice === 'number' && product.compareAtPrice > product.price
  const oldPrice = product.compareAtPrice ?? product.originalPrice
  const savings = typeof oldPrice === 'number' && oldPrice > product.price ? oldPrice - product.price : 0
  const inStock = product.inStock !== false && (product.stock ?? 0) > 0
  const lowStock = typeof product.stock === 'number' && product.stock > 0 && product.stock <= 5
  const stockLabel = !inStock
    ? 'Aktuell nicht verfügbar'
    : segment === 'b2b'
      ? `${product.stock} Stück auf Lager`
      : lowStock
        ? `Nur noch ${product.stock} verfügbar`
        : 'Sofort versandbereit'

  return (
    <section className="rounded-[1.5rem] border border-brand-border bg-white p-5 shadow-[0_10px_26px_rgba(10,10,10,0.05)]">
      <div className="flex flex-wrap items-end gap-3">
        <p className="text-4xl font-semibold text-brand-text">{formatPrice(product.price)}</p>
        {typeof oldPrice === 'number' && oldPrice > product.price ? (
          <p className="text-lg text-brand-text-muted line-through">{formatPrice(oldPrice)}</p>
        ) : null}
      </div>

      <p className="mt-2 text-sm text-brand-text-muted">Inkl. MwSt., versandfertig in 24h.</p>

      {product.badges && product.badges.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {product.badges.map((badge) => (
            <span
              key={badge.id}
              className={[
                'ui-pill text-xs font-semibold',
                badge.tone === 'dark'
                  ? 'ui-pill-active'
                  : badge.tone === 'accent'
                    ? 'border-black/10 bg-amber-50 text-brand-text'
                    : 'ui-pill-muted',
              ].join(' ')}
            >
              {badge.label}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-brand-text-muted">
        {savings > 0 ? (
          <span className="ui-pill text-xs font-semibold">
            <BadgeCheck className="h-3.5 w-3.5 text-brand-success" />
            Du sparst {formatPrice(savings)}
          </span>
        ) : null}
        <span className="ui-pill text-xs font-semibold">
          <Truck className="h-3.5 w-3.5 text-brand-text" />
          {segment === 'b2b' ? 'Kauf auf Rechnung möglich' : `Kostenloser Versand ab ${formatPrice(FREE_SHIPPING_THRESHOLD)}`}
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="inline-flex items-center gap-2 rounded-2xl border border-brand-border bg-brand-bg px-3 py-3 text-sm font-semibold text-brand-text">
          <PackageCheck className={inStock ? 'h-4 w-4 text-brand-success' : 'h-4 w-4 text-brand-danger'} />
          {stockLabel}
        </div>
        <div className="inline-flex items-center gap-2 rounded-2xl border border-brand-border bg-brand-bg px-3 py-3 text-sm font-semibold text-brand-text">
          <Truck className="h-4 w-4 text-brand-text" />
          {product.deliveryEstimate || (inStock ? 'Lieferung in 24-48h' : 'Lieferung nach Verfügbarkeit')}
        </div>
        <div className="inline-flex items-center gap-2 rounded-2xl border border-brand-border bg-brand-bg px-3 py-3 text-sm font-semibold text-brand-text">
          <RotateCcw className="h-4 w-4 text-brand-text" />
          {segment === 'b2b' ? 'Persönlicher B2B Support' : '30 Tage sorgenfreie Rückgabe'}
        </div>
      </div>
    </section>
  )
}
