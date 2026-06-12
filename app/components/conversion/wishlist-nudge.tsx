// Purpose: Nudge to check wishlist items
// Docs: AGENTS.md

import Link from 'next/link'
import { Heart, TrendingDown } from 'lucide-react'

export function WishlistNudge({ count }: { count: number }) {
  if (count === 0) return null

  return (
    <Link
      href="/wunschliste"
      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sale/10">
        <Heart className="size-5 fill-sale text-sale" aria-hidden="true" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold">
          {count} {count === 1 ? 'Artikel wartet' : 'Artikel warten'} auf deiner Wunschliste
        </p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <TrendingDown className="size-3" aria-hidden="true" />
          Beliebte Artikel können jederzeit ausverkauft sein
        </p>
      </div>
      <span className="shrink-0 text-sm font-medium text-primary">Ansehen</span>
    </Link>
  )
}
