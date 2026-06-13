// Purpose: Cart item row — image, name, variant, qty selector, price, remove,
// stock warning, backorder notice
// Docs: PLAN-VERKAUFSFAEHIG.md

import Link from 'next/link'
import Image from 'next/image'
import { CartItemControls } from '@/components/CartItemControls'
import { formatEuro, toCents } from '@/lib/format'
import type { Product } from '@/lib/data'
import type { CartItem } from '@/lib/actions/cart'
import { AlertTriangleIcon, PackageIcon } from 'lucide-react'

interface EnrichedCartItem extends CartItem {
  product: Product
}

export function CartItemRow({
  item,
}: {
  item: EnrichedCartItem
}) {
  const unitCents = toCents(item.product.price)
  const lineTotal = unitCents * item.quantity
  const isLowStock = item.product.stock > 0 && item.product.stock <= 5
  const isOutOfStock = item.product.stock === 0

  const variantName = item.variant_id
    ? item.product.variants?.find(
        (v) => v.cj_variant_id === item.variant_id,
      )?.name
    : null

  return (
    <li className="flex gap-3 rounded-lg border border-border bg-card p-3 sm:gap-4 sm:p-4">
      {/* ── Product image ────────────────────────────────────────── */}
      <Link
        href={`/produkt/${item.product.id}`}
        className="relative size-20 shrink-0 overflow-hidden rounded-md bg-muted sm:size-24"
      >
        <Image
          src={item.product.imageUrl}
          alt={item.product.title}
          fill
          sizes="(min-width: 640px) 96px, 80px"
          className="object-cover"
        />
      </Link>

      {/* ── Details ──────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <Link
              href={`/produkt/${item.product.id}`}
              className="line-clamp-2 font-semibold hover:underline"
            >
              {item.product.title}
            </Link>
            {variantName && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {variantName}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              {formatEuro(unitCents)} / Stück
            </p>
          </div>
          <p className="shrink-0 font-semibold tabular-nums">
            {formatEuro(lineTotal)}
          </p>
        </div>

        {/* ── Quantity controls ──────────────────────────────────── */}
        <CartItemControls
          itemId={item.id}
          quantity={item.quantity}
          stock={item.product.stock}
        />

        {/* ── Stock warning ──────────────────────────────────────── */}
        {isLowStock && (
          <p className="flex items-center gap-1 text-xs font-medium text-sale">
            <AlertTriangleIcon className="size-3.5 shrink-0" aria-hidden />
            Nur noch {item.product.stock} auf Lager — schnell bestellen!
          </p>
        )}

        {/* ── Backorder notice ───────────────────────────────────── */}
        {isOutOfStock && (
          <p className="flex items-center gap-1 text-xs font-medium text-accent">
            <PackageIcon className="size-3.5 shrink-0" aria-hidden />
            Vorbestellung — wird nachgeliefert sobald verfügbar
          </p>
        )}
      </div>
    </li>
  )
}
