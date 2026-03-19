import { Check, Star, Truck } from 'lucide-react'
import { ProductActionPanel } from '@/features/product/actions/ProductActionPanel'
import { ProductPricingBlock } from '@/features/product/pricing/ProductPricingBlock'
import { ProductTrustPanel } from '@/features/product/trust/ProductTrustPanel'
import type { CustomerSegment } from '@simone/contracts'
import type { Product } from '@/types'

type ProductInfoPanelProps = {
  categoryName: string
  product: Product
  segment: CustomerSegment
  quantity: number
  maxQuantity: number
  ctaLabel?: string
  trustFirst?: boolean
  onQuantityChange: (value: number) => void
  onAddToCart: () => void
}

export function ProductInfoPanel({
  categoryName,
  product,
  segment,
  quantity,
  maxQuantity,
  ctaLabel,
  trustFirst = false,
  onQuantityChange,
  onAddToCart,
}: ProductInfoPanelProps) {
  const benefitList =
    segment === 'b2b'
      ? ['Premium Verarbeitungsqualität', 'Geprüfte Langlebigkeit', 'Volle Garantie']
      : ['Premium Verarbeitungsqualität', 'Kostenloser Versand ab 50€', '30 Tage Geld-zurück-Garantie']
  const highlights = (product.highlights || []).slice(0, 3)
  const useCases = (product.useCases || []).slice(0, 3)

  return (
    <article className="space-y-4 lg:sticky lg:top-24 lg:self-start">
      <section className="rounded-[1.8rem] border border-brand-border bg-white p-6 shadow-[0_14px_36px_rgba(10,10,10,0.06)]">
        <div className="flex flex-wrap items-center gap-3 text-sm text-brand-text-muted">
          <span className="ui-pill text-[0.72rem] font-semibold uppercase tracking-[0.1em]">
            {categoryName}
          </span>
          {typeof product.rating === 'number' && typeof product.reviewCount === 'number' && product.reviewCount > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-[#d2a44d] text-[#d2a44d]" />
              {product.rating.toFixed(1)} ({product.reviewCount})
            </span>
          ) : null}
          {product.deliveryEstimate ? (
            <span className="ui-pill text-xs font-semibold">
              <Truck className="h-3.5 w-3.5" />
              {product.deliveryEstimate}
            </span>
          ) : null}
        </div>

        <h1 className="mt-3 text-4xl leading-tight md:text-5xl">{product.name}</h1>
        <p className="mt-4 text-base leading-7 text-brand-text-muted">{product.description}</p>

        {useCases.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {useCases.map((entry) => (
              <span
                key={entry}
                className="ui-pill text-xs font-semibold"
              >
                {entry}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-6 grid gap-2">
          {benefitList.map((entry) => (
            <div
              key={entry}
              className="inline-flex items-center gap-2 rounded-2xl border border-brand-border bg-brand-bg px-3 py-3 text-sm font-medium text-brand-text"
            >
              <Check className="h-4 w-4 text-brand-success" />
              {entry}
            </div>
          ))}
        </div>

        {highlights.length > 0 ? (
          <div className="mt-6 rounded-[1.5rem] border border-brand-border bg-brand-surface p-4">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-brand-text-muted">
              Highlights & Vorteile
            </p>
            <div className="mt-3 grid gap-2">
              {highlights.map((entry) => (
                <div key={entry} className="inline-flex items-center gap-2 text-sm text-brand-text">
                  <Check className="h-4 w-4 text-brand-success" />
                  {entry}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <ProductPricingBlock product={product} segment={segment} />

      {trustFirst ? <ProductTrustPanel segment={segment} /> : null}

      <ProductActionPanel
        product={product}
        quantity={quantity}
        maxQuantity={maxQuantity}
        ctaLabel={ctaLabel}
        onQuantityChange={onQuantityChange}
        onAddToCart={onAddToCart}
      />

      {!trustFirst ? <ProductTrustPanel segment={segment} /> : null}
    </article>
  )
}
