import Link from '@/components/ui/Link'
import { Minus, Plus, ShoppingCart, Truck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatPrice } from '@/lib/utils'
import type { Product } from '@/types'

type ProductActionPanelProps = {
  product: Product
  quantity: number
  maxQuantity: number
  ctaLabel?: string
  onQuantityChange: (value: number) => void
  onAddToCart: () => void
}

export function ProductActionPanel({
  product,
  quantity,
  maxQuantity,
  ctaLabel,
  onQuantityChange,
  onAddToCart,
}: ProductActionPanelProps) {
  const canAddToCart = product.inStock !== false && maxQuantity > 0
  const canDecrease = quantity > 1
  const canIncrease = canAddToCart && quantity < maxQuantity
  const label = canAddToCart ? ctaLabel || 'In den Warenkorb' : 'Aktuell nicht verfügbar'
  const selectedTotal = product.price * quantity
  const quantityHint = !canAddToCart
    ? 'Aktuell keine direkte Bestellung möglich.'
    : maxQuantity >= 999
      ? 'Menge später im Checkout weiter anpassbar.'
      : `Bis zu ${maxQuantity} Stück sofort bestellbar.`

  return (
    <section className="rounded-[1.5rem] border border-brand-border bg-white p-5 shadow-[0_10px_26px_rgba(10,10,10,0.05)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="inline-flex items-center rounded-full border border-brand-border bg-brand-bg p-1">
          <button
            type="button"
            onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
            disabled={!canDecrease}
            aria-label={`Menge reduzieren für ${product.name}`}
            className={[
              'ui-icon-btn',
              canDecrease ? '' : 'cursor-not-allowed opacity-50',
            ].join(' ')}
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-[2.6rem] text-center text-sm font-semibold text-brand-text">{quantity}</span>
          <button
            type="button"
            onClick={() => onQuantityChange(Math.min(maxQuantity, quantity + 1))}
            disabled={!canIncrease}
            aria-label={`Menge erhöhen für ${product.name}`}
            className={[
              'ui-icon-btn',
              canIncrease ? '' : 'cursor-not-allowed opacity-50',
            ].join(' ')}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <Button size="lg" onClick={onAddToCart} disabled={!canAddToCart} leftIcon={<ShoppingCart className="h-4 w-4" />} className="sm:flex-1">
          {label}
        </Button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="rounded-2xl border border-brand-border bg-brand-bg px-3 py-3">
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-brand-text-muted">Auswahl</p>
          <p className="mt-1 text-sm font-semibold text-brand-text">{quantity} x {formatPrice(product.price)}</p>
        </div>
        <div className="rounded-2xl border border-brand-border bg-brand-bg px-3 py-3">
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-brand-text-muted">Gesamt jetzt</p>
          <p className="mt-1 text-sm font-semibold text-brand-text">{formatPrice(selectedTotal)}</p>
          <p className="mt-1 text-xs text-brand-text-muted">{quantityHint}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 text-sm text-brand-text-muted">
          <Truck className="h-4 w-4 text-brand-text" />
          {product.deliveryEstimate || 'Lieferung, Rückgabe und Kontakt bleiben vor dem Kauf sichtbar.'}
        </p>
        <Link href="/kontakt" className="inline-flex min-h-[2.75rem] items-center rounded-full border border-brand-border bg-white px-3 py-2 text-xs font-semibold text-brand-text-muted transition-colors hover:border-black/30 hover:text-black">
          Vor dem Kauf fragen
        </Link>
      </div>
    </section>
  )
}
