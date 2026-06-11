// Purpose: Product card with discount badge, sold-out overlay, rating (Step 10)
// Docs: PLAN-VERKAUFSFAEHIG.md

import Image from 'next/image'
import Link from 'next/link'
import type { Product } from '@/lib/data'
import { PriceTag } from './PriceTag'
import { StarIcon } from './icons'

export function ProductCard({ product }: { product: Product }) {
  const discount = product.originalPrice
    ? Math.round(
        ((product.originalPrice - product.price) / product.originalPrice) * 100,
      )
    : 0
  const soldOut = product.stock <= 0

  return (
    <Link
      href={`/produkt/${product.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        <Image
          src={product.imageUrl}
          alt={product.title}
          fill
          sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {discount > 0 && !soldOut && (
          <div className="absolute right-2 top-2 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
            -{discount}%
          </div>
        )}
        {soldOut && (
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
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 font-semibold text-balance text-foreground">
          {product.title}
        </h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {product.description}
        </p>
        {product.rating > 0 && (
          <div className="flex items-center gap-1 text-sm">
            <StarIcon
              className="size-4 fill-yellow-500 text-yellow-500"
              aria-hidden
            />
            <span className="font-medium">{product.rating.toFixed(1)}</span>
            <span className="text-muted-foreground">
              ({product.ratingCount})
            </span>
          </div>
        )}
        <div className="mt-auto pt-2">
          <PriceTag
            priceCents={Math.round(Number(product.price) * 100)}
            originalPriceCents={
              product.originalPrice != null
                ? Math.round(Number(product.originalPrice) * 100)
                : null
            }
          />
        </div>
      </div>
    </Link>
  )
}
