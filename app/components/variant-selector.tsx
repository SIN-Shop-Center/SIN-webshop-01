'use client'

import { useState, useTransition } from 'react'
import { addToCart } from '@/lib/actions/cart'
import { toCents } from '@/lib/format'
import { PriceTag } from './PriceTag'
import type { Product } from '@/lib/data'

export function VariantSelector({ product }: { product: Product }) {
  const hasColors = (product.colors?.length ?? 0) > 0
  const hasSizes = (product.sizes?.length ?? 0) > 0

  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [added, setAdded] = useState(false)

  const outOfStock = product.stock <= 0

  function handleAdd() {
    if (hasColors && !selectedColor) {
      setError('Bitte wähle zuerst eine Farbe.')
      return
    }
    if (hasSizes && !selectedSize) {
      setError('Bitte wähle zuerst eine Größe.')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await addToCart(product.id, quantity)
        setAdded(true)
        setTimeout(() => setAdded(false), 2000)
      } catch {
        setError('Das Produkt konnte nicht hinzugefügt werden.')
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <PriceTag priceCents={toCents(product.price)} size="lg" />

      {hasColors && (
        <fieldset>
          <legend className="pb-2 text-sm font-medium text-foreground">Farbe</legend>
          <div className="flex flex-wrap gap-2">
            {product.colors!.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => { setSelectedColor(color); setError(null) }}
                aria-pressed={selectedColor === color}
                className={`rounded-md border px-4 py-2 text-sm transition-colors ${
                  selectedColor === color
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-foreground hover:bg-muted'
                }`}
              >
                {color}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {hasSizes && (
        <fieldset>
          <legend className="pb-2 text-sm font-medium text-foreground">Größe</legend>
          <div className="flex flex-wrap gap-2">
            {product.sizes!.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => { setSelectedSize(size); setError(null) }}
                aria-pressed={selectedSize === size}
                className={`rounded-md border px-4 py-2 text-sm transition-colors ${
                  selectedSize === size
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-foreground hover:bg-muted'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex items-center gap-3">
        <label htmlFor="pdp-quantity" className="text-sm font-medium text-foreground">
          Menge
        </label>
        <div className="flex items-center rounded-md border border-border">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            aria-label="Menge verringern"
            className="px-3 py-2 text-foreground hover:bg-muted"
          >
            -
          </button>
          <span id="pdp-quantity" className="min-w-10 text-center text-sm text-foreground">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(99, q + 1))}
            aria-label="Menge erhöhen"
            className="px-3 py-2 text-foreground hover:bg-muted"
          >
            +
          </button>
        </div>
        {product.stock > 0 && product.stock <= 5 && (
          <span className="text-sm text-destructive">Nur noch {product.stock} verfügbar</span>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleAdd}
        disabled={outOfStock || isPending}
        className="btn btn-primary btn-lg w-full"
      >
        {outOfStock ? 'Ausverkauft' : isPending ? 'Wird hinzugefügt…' : added ? 'Hinzugefügt ✓' : 'In den Warenkorb'}
      </button>
    </div>
  )
}
