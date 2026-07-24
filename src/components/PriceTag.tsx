// Purpose: PAngV-compliant price display with optional strikethrough original price
// Docs: PLAN-VERKAUFSFAEHIG.md (Step 9 — PAngV + Step 10 polish)
//
// PAngV (Preisangabenverordnung): "inkl. MwSt., zzgl. Versand" muss an jedem
// Preis im Online-Shop stehen.

import Link from 'next/link'
import { formatEuro } from '@/lib/format'

interface PriceTagProps {
  priceCents: number
  originalPriceCents?: number | null
  size?: 'md' | 'lg'
}

export function PriceTag({
  priceCents,
  originalPriceCents,
  size = 'md',
}: PriceTagProps) {
  const hasDiscount =
    originalPriceCents != null && originalPriceCents > priceCents

  const discountPercent = hasDiscount
    ? Math.round(((originalPriceCents! - priceCents) / originalPriceCents!) * 100)
    : 0

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-3">
        <span
          className={
            size === 'lg'
              ? 'text-4xl font-extrabold tracking-tight text-foreground'
              : 'text-xl font-bold tracking-tight text-foreground'
          }
        >
          {formatEuro(priceCents)}
        </span>
        {hasDiscount && (
          <>
            <span
              className={
                size === 'lg'
                  ? 'text-xl text-muted-foreground line-through'
                  : 'text-sm text-muted-foreground line-through'
              }
            >
              {formatEuro(originalPriceCents)}
            </span>
            <span className="rounded-full bg-sale px-2 py-0.5 text-xs font-bold text-sale-foreground">
              -{discountPercent}%
            </span>
          </>
        )}
        {hasDiscount && (
          <span className="sr-only">
            Reduziert von {formatEuro(originalPriceCents)} auf{' '}
            {formatEuro(priceCents)}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        inkl. MwSt.,{' '}
        <Link href="/versand" className="underline hover:text-foreground">
          zzgl. Versand
        </Link>
      </p>
    </div>
  )
}
