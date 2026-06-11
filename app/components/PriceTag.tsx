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

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-2">
        <span
          className={
            size === 'lg'
              ? 'text-3xl font-bold tracking-tight'
              : 'text-lg font-bold tracking-tight'
          }
        >
          {formatEuro(priceCents)}
        </span>
        {hasDiscount && (
          <span
            className={
              size === 'lg'
                ? 'text-lg text-muted-foreground line-through'
                : 'text-sm text-muted-foreground line-through'
            }
          >
            {formatEuro(originalPriceCents)}
          </span>
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
