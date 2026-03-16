'use client'

import { memo } from 'react'
import Image from 'next/image'
import Link from '@/components/ui/Link'
import { Button } from '@/components/ui/Button'
import { PackageCheck, ShoppingCart, Star } from 'lucide-react'
import { useCartStore } from '@/lib/store'
import { calculateDiscount, cn, formatPrice } from '@/lib/utils'
import { trackEvent } from '@/lib/analytics'
import { useCustomerSegmentStore } from '@/features/segment'
import type { Product } from '@/types'

interface ProductCardProps { product: Product; index?: number }

const STAR_SLOTS = [0, 1, 2, 3, 4] as const

function categoryName(product: Product): string {
  if (typeof product.category === 'string') {
    return product.category
  }
  if (typeof product.category?.name === 'string') {
    return product.category.name
  }
  return 'Produkt'
}

function ProductCardBase({ product, index = 0 }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem)
  const segment = useCustomerSegmentStore((state) => state.segment)
  const productHref = `/products/${encodeURIComponent(product.id)}`
  const primaryImage = product.images[0] || '/catalog/product-fallback.svg'
  const hasDiscount = typeof product.compareAtPrice === 'number' && product.compareAtPrice > product.price
  const discountPercent = hasDiscount ? calculateDiscount(product.compareAtPrice!, product.price) : 0
  const hasRating = typeof product.rating === 'number' && product.rating > 0
  const reviewCount = typeof product.reviewCount === 'number' ? product.reviewCount : 0
  const roundedRating = hasRating ? Math.max(0, Math.min(5, Math.round(product.rating!))) : 0
  const oldPrice = product.compareAtPrice ?? product.originalPrice
  const savingsAmount = typeof oldPrice === 'number' && oldPrice > product.price ? oldPrice - product.price : 0
  const inStock = product.inStock !== false && (product.stock ?? 0) > 0
  const highlights = (product.highlights || []).slice(0, 2)
  const statusText = inStock
    ? segment === 'b2b'
      ? `${product.stock ?? 0} Stück verfügbar`
      : (product.deliveryEstimate || 'Lieferung in 24-48h')
    : 'Aktuell nicht verfügbar'
  const utilityText = savingsAmount > 0 ? `Spare ${formatPrice(savingsAmount)}` : segment === 'b2b' ? 'Firmenkauf möglich' : '30 Tage Rückgabe'
  const primaryBadge = product.badges?.[0] || (hasDiscount ? { id: 'discount', label: `-${discountPercent}%`, tone: 'dark' as const } : null)

  const handleAddToCart = () => {
    addItem({ id: product.id, name: product.name, price: product.price, image: primaryImage }, 1)
    void trackEvent('add_to_cart', {
      payload: {
        product_id: product.id,
        price: product.price,
        segment,
      },
    })
  }

  return (
    <article className="stagger-enter h-full" style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}>
      <div className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-brand-border bg-white shadow-[var(--shadow-soft)] transition-all duration-200 hover:-translate-y-1 hover:border-black/15 hover:shadow-[0_18px_40px_rgba(18,18,18,0.08)]">
        <Link href={productHref} prefetch={false} className="flex flex-1 flex-col">
          <div className="relative aspect-[4/3] overflow-hidden bg-brand-bg">
            <Image
              src={primaryImage}
              alt={product.name}
              fill
              priority={index < 8}
              loading={index < 8 ? 'eager' : 'lazy'}
              decoding="async"
              className="object-contain object-center p-4 transition-transform duration-500 group-hover:scale-[1.02]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
            <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-3">
              <span className="ui-pill ui-pill-muted text-[11px] font-semibold uppercase tracking-[0.08em]">
                {categoryName(product)}
              </span>
              {primaryBadge ? (
                <span
                  className={cn(
                    'ui-pill text-[11px] font-semibold shadow-sm',
                    primaryBadge.tone === 'dark'
                      ? 'ui-pill-active'
                      : primaryBadge.tone === 'accent'
                        ? 'border-black/10 bg-[#dff5e8] text-brand-success'
                        : 'ui-pill-muted',
                  )}
                >
                  {primaryBadge.label}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-1 flex-col p-4">
            <p className="line-clamp-2 text-base font-semibold leading-6 text-brand-text transition-colors group-hover:text-black">
              {product.name}
            </p>
            <p className="mt-1.5 line-clamp-1 text-sm leading-6 text-brand-text-muted">{product.description}</p>
            {product.useCases && product.useCases.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {product.useCases.slice(0, 2).map((entry) => (
                  <span
                    key={entry}
                    className="ui-pill ui-pill-muted text-[10px] font-semibold"
                  >
                    {entry}
                  </span>
                ))}
              </div>
            ) : null}
            {hasRating ? (
              <div className="mt-3 flex items-center gap-2 text-xs text-brand-text-muted">
                <div className="flex items-center gap-0.5">
                  {STAR_SLOTS.map((slot) => (
                    <Star
                      key={slot}
                      className={cn(
                        'h-3.5 w-3.5',
                        slot < roundedRating ? 'fill-[#d2a44d] text-[#d2a44d]' : 'text-brand-border-strong',
                      )}
                    />
                  ))}
                </div>
                <span>{product.rating?.toFixed(1)}</span>
                <span>({reviewCount})</span>
              </div>
            ) : null}
            <div className="mt-3 flex items-end gap-2">
              <p className="text-xl font-semibold text-brand-text">{formatPrice(product.price)}</p>
              {typeof oldPrice === 'number' && oldPrice > product.price ? (
                <p className="text-sm text-brand-text-muted line-through">{formatPrice(oldPrice)}</p>
              ) : null}
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <span className="ui-pill text-[10px] font-semibold">
                <PackageCheck className={cn('h-3.5 w-3.5', inStock ? 'text-brand-success' : 'text-brand-danger')} />
                {statusText}
              </span>
              <span className="text-[10px] font-medium text-brand-text-muted">{utilityText}</span>
            </div>
            {highlights.length > 0 ? (
              <div className="mt-3 grid gap-1.5 text-[11px] leading-5 text-brand-text-muted">
                {highlights.map((entry) => (
                  <p key={entry} className="line-clamp-1">
                    {entry}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        </Link>
        <div className="px-4 pb-4">
          <Button
            type="button"
            onClick={handleAddToCart}
            disabled={!inStock}
            aria-label={inStock ? `${product.name} in den Warenkorb` : `${product.name} nicht verfügbar`}
            variant={inStock ? 'secondary' : 'outline'}
            size="sm"
            fullWidth
            leftIcon={<ShoppingCart className="h-4 w-4" />}
            className={inStock ? undefined : 'border-brand-border bg-brand-bg text-brand-text-muted'}
          >
            {inStock ? 'In den Warenkorb' : 'Nicht verfügbar'}
          </Button>
        </div>
      </div>
    </article>
  )
}

export const ProductCard = memo(ProductCardBase)
