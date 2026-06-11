// Purpose: PriceTag component with PAngV-compliant "inkl. MwSt." label
// Docs: PLAN-VERKAUFSFAEHIG.md (Step 9 — PAngV compliance)
//
// PAngV (Preisangabenverordnung): "inkl. MwSt., zzgl. Versand" muss an jedem
// Preis im Online-Shop stehen.
//
// Bei Kleinunternehmerregelung (§19 UStG) stattdessen:
// "Gemäß §19 UStG wird keine Umsatzsteuer ausgewiesen"

import Link from 'next/link'

export function PriceTag({
  priceCents,
  originalPriceCents,
  size = 'md',
}: {
  priceCents: number
  originalPriceCents?: number | null
  size?: 'md' | 'lg'
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className={size === 'lg' ? 'text-3xl font-bold' : 'text-lg font-bold'}>
          {(priceCents / 100).toFixed(2)} €
        </span>
        {originalPriceCents != null && originalPriceCents > priceCents && (
          <span
            className={
              size === 'lg'
                ? 'text-xl text-muted-foreground line-through'
                : 'text-sm text-muted-foreground line-through'
            }
          >
            {(originalPriceCents / 100).toFixed(2)} €
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
