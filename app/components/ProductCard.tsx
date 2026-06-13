// Purpose: Product card with badge overlays, rating, quick-add
// Docs: AGENTS.md

import Link from 'next/link'
import type { Product } from '@/lib/data'
import { toCents } from '@/lib/format'
import { getProductBadges } from '@/lib/product-badges'
import { PriceTag } from './PriceTag'
import { StarIcon } from './icons'
import { CardQuickAdd } from './card-quick-add'
import { ProductImageOverlay } from './product-image-overlay'
import { ProductCardImage } from './product-card-image'
import { WishlistButton } from './WishlistButton'

function StarRating({ rating }: { rating: number }) {
  const percentage = Math.max(0, Math.min(100, (rating / 5) * 100))
  return (
    <div className="relative inline-flex shrink-0" aria-hidden>
      <div className="flex">
        {Array.from({ length: 5 }).map((_, i) => (
          <StarIcon key={i} className="size-3.5 text-border" />
        ))}
      </div>
      <div
        className="absolute inset-0 flex overflow-hidden"
        style={{ width: `${percentage}%` }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <StarIcon
            key={i}
            className="size-3.5 shrink-0 fill-rating text-rating"
          />
        ))}
      </div>
    </div>
  )
}

export function ProductCard({ product }: { product: Product }) {
  const soldOut = product.stock <= 0
  const badges = getProductBadges({
    price: product.price,
    originalPrice: product.originalPrice ?? null,
    stock: product.stock,
    rating: product.rating,
    ratingCount: product.ratingCount,
    soldCount: product.soldCount,
    isFeatured: product.isFeatured,
    createdAt: product.createdAt ?? null,
  })

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20">
      <Link
        href={`/produkt/${product.id}`}
        className="absolute inset-0 z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={product.title}
      />

      <div className="relative aspect-square overflow-hidden bg-muted">
        <ProductCardImage
          images={
            Array.isArray(product.imageGallery)
              ? product.imageGallery.flat(2).filter((img): img is string => typeof img === 'string' && Boolean(img))
              : product.imageUrl
                ? [product.imageUrl]
                : []
          }
          alt={product.title}
        />

        <ProductImageOverlay badges={badges} size="sm" />

        <div className="absolute right-2 top-2 z-20">
          <WishlistButton productId={product.id} variant="icon" />
        </div>

        {soldOut && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            aria-hidden="true"
          >
            <span className="rounded-full bg-destructive px-4 py-1.5 text-sm font-bold text-destructive-foreground shadow-lg">
              Ausverkauft
            </span>
          </div>
        )}
        {soldOut && (
          <span className="sr-only">Ausverkauft</span>
        )}

        {!soldOut && (
          <div className="absolute inset-x-2 bottom-2 z-20 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
            <CardQuickAdd productId={product.id} />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">
          {product.title}
        </h3>

        {product.rating > 0 ? (
          <div className="flex items-center gap-1.5 text-xs">
            <StarRating rating={product.rating} />
            <span className="font-semibold text-foreground">{product.rating.toFixed(1)}</span>
            <span className="text-muted-foreground">({product.ratingCount})</span>
            <span className="sr-only">
              {product.rating.toFixed(1)} von 5 Sternen bei {product.ratingCount} Bewertungen
            </span>
          </div>
        ) : (
          <span className="text-xs font-medium text-accent">Neu im Sortiment</span>
        )}

        <div className="mt-auto flex flex-col gap-1.5 pt-2 border-t border-border/50">
          <PriceTag
            priceCents={toCents(product.price)}
            originalPriceCents={
              product.originalPrice != null ? toCents(product.originalPrice) : null
            }
          />
        </div>
      </div>
    </div>
  )
}
