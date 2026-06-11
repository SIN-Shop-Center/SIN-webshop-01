// Purpose: Product card for Next.js storefront (Step 1 + Step 9 PAngV)
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)

import Image from 'next/image'
import Link from 'next/link'
import type { Product } from '../lib/data'
import { PriceTag } from './PriceTag'

export function ProductCard({ product }: { product: Product }) {
  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0

  return (
    <Link
      href={`/produkt/${product.id}`}
      className="group block overflow-hidden rounded-lg border border-border bg-background transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        <Image
          src={product.imageUrl}
          alt={product.title}
          fill
          className="object-cover transition-transform group-hover:scale-105"
        />
        {discount > 0 && (
          <div className="absolute right-2 top-2 rounded-full bg-accent px-2 py-1 text-xs font-semibold text-accent-foreground">
            -{discount}%
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="mb-1 font-semibold text-balance">{product.title}</h3>
        <p className="mb-2 text-sm text-muted-foreground line-clamp-2">
          {product.description}
        </p>
        <PriceTag
          priceCents={Math.round(Number(product.price) * 100)}
          originalPriceCents={
            product.originalPrice != null
              ? Math.round(Number(product.originalPrice) * 100)
              : null
          }
        />
        {product.rating > 0 && (
          <div className="mt-2 flex items-center gap-1 text-sm">
            <span className="text-yellow-500">★</span>
            <span>{product.rating}</span>
            <span className="text-muted-foreground">({product.ratingCount})</span>
          </div>
        )}
      </div>
    </Link>
  )
}
