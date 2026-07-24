// Purpose: Wishlist grid with remove + bulk add-to-cart (client component)
// Docs: AGENTS.md

'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { toggleWishlist } from '@/lib/actions/wishlist'
import { addToCart } from '@/lib/actions/cart'
import { toCents } from '@/lib/format'
import { PriceTag } from '@/components/PriceTag'
import {
  HeartIcon,
  TrashIcon,
  CartIcon,
  SpinnerIcon,
  CheckIcon,
  AlertCircleIcon,
} from '@/components/icons'
import type { Product } from '@/lib/data'

export function WishlistGrid({ products }: { products: Product[] }) {
  const [removing, setRemoving] = useState<string | null>(null)
  const [bulkPending, setBulkPending] = useState(false)
  const [bulkResult, setBulkResult] = useState<{
    added: number
    failed: number
  } | null>(null)

  async function handleRemove(productId: string) {
    setRemoving(productId)
    try {
      await toggleWishlist(productId)
    } catch {
    } finally {
      setRemoving(null)
    }
  }

  async function handleAddAll() {
    setBulkPending(true)
    setBulkResult(null)
    let added = 0
    let failed = 0
    for (const product of products) {
      try {
        await addToCart(product.id)
        added++
      } catch {
        failed++
      }
    }
    setBulkResult({ added, failed })
    setBulkPending(false)
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-muted-foreground">
          {products.length} gespeicherte{' '}
          {products.length === 1 ? 'Produkt' : 'Produkte'}
        </p>
        {products.length > 1 && (
          <button
            type="button"
            onClick={handleAddAll}
            disabled={bulkPending}
            className="btn btn-primary btn-md inline-flex items-center gap-2"
          >
            {bulkPending ? (
              <>
                <SpinnerIcon className="size-4 animate-spin" aria-hidden />
                Wird hinzugefügt…
              </>
            ) : (
              <>
                <CartIcon className="size-4" aria-hidden />
                Alle in den Warenkorb
              </>
            )}
          </button>
        )}
      </div>

      {bulkResult && (
        <div
          className="mb-6 rounded-md border border-border bg-muted/50 p-3 text-sm"
          role="status"
        >
          {bulkResult.added > 0 && (
            <p>
              <CheckIcon className="inline size-4 text-success" aria-hidden />{' '}
              {bulkResult.added} Artikel zum Warenkorb hinzugefügt.
            </p>
          )}
          {bulkResult.failed > 0 && (
            <p className="text-muted-foreground">
              <AlertCircleIcon className="inline size-4" aria-hidden />{' '}
              {bulkResult.failed} Artikel nicht mehr verfügbar.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <div
            key={product.id}
            className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <Link
              href={`/produkt/${product.id}`}
              className="absolute inset-0 z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={product.title}
            />

            <div className="relative aspect-square overflow-hidden bg-muted">
              {product.imageUrl && (
                <Image
                  src={product.imageUrl}
                  alt={product.title}
                  fill
                  sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                />
              )}
              {product.stock <= 0 && (
                <div
                  aria-hidden
                  className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm"
                >
                  <span className="rounded-full bg-foreground/90 px-4 py-1.5 text-sm font-semibold text-background">
                    Ausverkauft
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-1 flex-col gap-1.5 p-3">
              <h3 className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                {product.title}
              </h3>
              <div className="mt-auto pt-1">
                <PriceTag
                  priceCents={toCents(product.price)}
                  originalPriceCents={
                    product.originalPrice != null
                      ? toCents(product.originalPrice)
                      : null
                  }
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleRemove(product.id)}
              disabled={removing === product.id}
              className="absolute right-2 top-2 z-20 flex size-8 items-center justify-center rounded-full bg-background/80 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-destructive/10 hover:text-destructive"
              aria-label={`"${product.title}" von Wunschliste entfernen`}
            >
              {removing === product.id ? (
                <SpinnerIcon className="size-4 animate-spin" aria-hidden />
              ) : (
                <TrashIcon className="size-4" aria-hidden />
              )}
            </button>
          </div>
        ))}
      </div>
    </>
  )
}
