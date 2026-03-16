import Link from '@/components/ui/Link'
import { Check, GitCompareArrows, Star } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatPrice } from '@/lib/utils'
import type { Product } from '@/types'

type ProductComparisonSectionProps = {
  currentProduct: Product
  products: Product[]
  compareIds: string[]
  onToggleCompare: (productId: string) => void
  onClearCompare: () => void
}

export function ProductComparisonSection({
  currentProduct,
  products,
  compareIds,
  onToggleCompare,
  onClearCompare,
}: ProductComparisonSectionProps) {
  if (products.length === 0) {
    return null
  }

  return (
    <section className="mt-14">
      <div className="mb-5 flex flex-col gap-2">
        <p className="section-eyebrow">Weiter vergleichen</p>
        <h2 className="text-3xl md:text-4xl">Ähnliche Produkte im direkten Vergleich</h2>
        <p className="max-w-3xl text-sm leading-7 text-brand-text-muted">
          Preis, Lieferfenster und Einsatzbereich bleiben nebeneinander sichtbar, damit die Entscheidung nicht im Kopf
          zusammengebaut werden muss.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {products.map((product) => {
          const selected = compareIds.includes(product.id)
          return (
            <article
              key={product.id}
              className="rounded-[1.7rem] border border-brand-border bg-white p-5 shadow-[0_10px_26px_rgba(10,10,10,0.05)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-brand-text-muted">
                    {(product.category?.name || product.category || 'Produkt').toString()}
                  </p>
                  <h3 className="mt-2 text-xl leading-7 text-brand-text">{product.name}</h3>
                </div>
                <span className="ui-pill text-xs font-semibold">
                  {formatPrice(product.price)}
                </span>
              </div>

              <div className="mt-4 grid gap-2 text-sm">
                <div className="rounded-2xl border border-brand-border bg-brand-bg px-3 py-3">
                  <p className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-brand-text-muted">
                    Lieferfenster
                  </p>
                  <p className="mt-1 font-semibold text-brand-text">
                    {product.deliveryEstimate || 'Lieferung nach Verfügbarkeit'}
                  </p>
                </div>
                <div className="rounded-2xl border border-brand-border bg-brand-bg px-3 py-3">
                  <p className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-brand-text-muted">
                    Bewertung
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1.5 font-semibold text-brand-text">
                    <Star className="h-4 w-4 fill-[#d2a44d] text-[#d2a44d]" />
                    {typeof product.rating === 'number' ? product.rating.toFixed(1) : 'Neu'}
                    {typeof product.reviewCount === 'number' ? <span>({product.reviewCount})</span> : null}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                {(product.highlights || []).slice(0, 3).map((entry) => (
                  <div
                    key={`${product.id}:${entry}`}
                    className="inline-flex items-center gap-2 rounded-2xl border border-brand-border bg-white px-3 py-2.5 text-sm text-brand-text"
                  >
                    <Check className="h-4 w-4 text-brand-success" />
                    {entry}
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href={`/products/${encodeURIComponent(product.id)}`}
                  prefetch={false}
                  className="ui-pill ui-pill-active text-sm font-semibold"
                >
                  Produkt ansehen
                </Link>
                <Button
                  type="button"
                  variant={selected ? 'secondary' : 'outline'}
                  size="sm"
                  leftIcon={<GitCompareArrows className="h-4 w-4" />}
                  onClick={() => onToggleCompare(product.id)}
                >
                  {selected ? 'Im Vergleich' : 'Vergleich merken'}
                </Button>
              </div>
            </article>
          )
        })}
      </div>

      {compareIds.length > 0 ? (
        <div className="mt-5 rounded-[1.5rem] border border-brand-border bg-brand-surface px-4 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-brand-text-muted">
                Vergleichsauswahl
              </p>
              <p className="mt-1 text-sm leading-6 text-brand-text">
                {[
                  currentProduct.name,
                  ...products.filter((product) => compareIds.includes(product.id)).map((product) => product.name),
                ].join(' · ')}
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={onClearCompare}>
              Auswahl leeren
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
