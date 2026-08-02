// Purpose: Floating trust/rating badge (DoktorABC eTrusted-style), expandable on click
// Docs: AGENTS.md

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { StarIcon } from '@/components/icons'

export function FloatingTrustBadge({
  rating = 4.8,
  count = 0,
}: {
  rating?: number
  count?: number
}) {
  const [open, setOpen] = useState(false)

  // Ohne echte Bewertungen kein Fake-Badge anzeigen (Abmahnrisiko!)
  if (count === 0) return null

  return (
    <div className="fixed bottom-4 left-4 z-40">
      {open && (
        <div className="mb-2 w-64 rounded-xl border border-border bg-background p-4 shadow-lg">
          <p className="text-sm font-semibold text-foreground">Kundenbewertungen</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex" aria-hidden>
              {Array.from({ length: 5 }).map((_, i) => (
                <StarIcon
                  key={i}
                  className={`size-4 ${i < Math.round(rating) ? 'fill-primary text-primary' : 'text-muted-foreground'}`}
                />
              ))}
            </div>
            <span className="text-sm font-bold text-foreground">{rating.toFixed(2)}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Basierend auf {count.toLocaleString('de-DE')} Bewertungen
          </p>
          <Link
            href="/produkte"
            className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
          >
            Produkte mit Bewertungen ansehen
          </Link>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Kundenbewertungen: ${rating.toFixed(2)} von 5 Sternen aus ${count} Bewertungen`}
        className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 shadow-md transition-shadow hover:shadow-lg"
      >
        <StarIcon className="size-4 fill-primary text-primary" aria-hidden />
        <span className="text-sm font-bold text-foreground">{rating.toFixed(2)}</span>
        <span className="text-xs text-muted-foreground">
          {count.toLocaleString('de-DE')} Bewertungen
        </span>
      </button>
    </div>
  )
}
