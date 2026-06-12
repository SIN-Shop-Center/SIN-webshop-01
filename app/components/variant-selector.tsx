'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { addToCart } from '@/lib/actions/cart'
import { toCents } from '@/lib/format'
import { PriceTag } from './PriceTag'
import type { Product, ProductVariant } from '@/lib/data'

export function VariantSelector({ product }: { product: Product }) {
  const cjVariants = (product.variants ?? []).filter((v) => v.name)
  const hasColors = (product.colors?.length ?? 0) > 0
  const hasSizes = (product.sizes?.length ?? 0) > 0
  const hasCjVariants = cjVariants.length > 1

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    hasCjVariants ? (cjVariants.find((v) => v.stock > 0) ?? cjVariants[0]) : null,
  )
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [added, setAdded] = useState(false)

  const effectiveStock = selectedVariant?.stock ?? product.stock
  const outOfStock = effectiveStock <= 0

  function handleAdd() {
    if (hasColors && !selectedColor) { setError('Bitte wähle zuerst eine Farbe.'); return }
    if (hasSizes && !selectedSize) { setError('Bitte wähle zuerst eine Größe.'); return }
    setError(null)
    startTransition(async () => {
      try {
        await addToCart(product.id, quantity, selectedVariant?.cj_variant_id)
        setAdded(true)
        setTimeout(() => setAdded(false), 2000)
      } catch { setError('Das Produkt konnte nicht hinzugefügt werden.') }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <PriceTag priceCents={toCents(product.price)} size="lg" />

      {hasCjVariants && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">
            Variante{' '}
            <span className="text-muted-foreground">
              ({cjVariants.length} verfügbar)
            </span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {cjVariants.map((variant) => {
              const isSelected = selectedVariant?.cj_variant_id === variant.cj_variant_id
              const soldOut = variant.stock <= 0
              return (
                <button
                  key={variant.cj_variant_id}
                  type="button"
                  disabled={soldOut}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedVariant(variant)}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                    isSelected
                      ? 'border-foreground bg-foreground text-background'
                      : soldOut
                        ? 'cursor-not-allowed border-border text-muted-foreground line-through opacity-50'
                        : 'border-border hover:border-foreground'
                  }`}
                >
                  {variant.image_url && (
                    <span className="relative size-6 shrink-0 overflow-hidden rounded">
                      <Image src={variant.image_url || "/placeholder.svg"} alt="" fill sizes="24px" className="object-cover" />
                    </span>
                  )}
                  {variant.name}
                </button>
              )
            })}
          </div>
        </fieldset>
      )}

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
        <label htmlFor="pdp-quantity" className="text-sm font-medium text-foreground">Menge</label>
        <div className="flex items-center rounded-md border border-border">
          <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Menge verringern" className="px-3 py-2 text-foreground hover:bg-muted">-</button>
          <span id="pdp-quantity" className="min-w-10 text-center text-sm text-foreground">{quantity}</span>
          <button type="button" onClick={() => setQuantity((q) => Math.min(99, q + 1))} aria-label="Menge erhöhen" className="px-3 py-2 text-foreground hover:bg-muted">+</button>
        </div>
        {effectiveStock > 0 && effectiveStock <= 5 && (
          <span className="text-sm text-destructive">Nur noch {effectiveStock} verfügbar</span>
        )}
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

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
