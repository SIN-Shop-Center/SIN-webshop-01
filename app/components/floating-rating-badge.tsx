// app/components/floating-rating-badge.tsx
// Purpose: Schwebendes Bewertungs-Badge unten rechts (doktorabc-Pattern).
// Auf Mobil ausgeblendet, damit es nicht mit der Tab-Bar kollidiert.

import { Star } from 'lucide-react'

export function FloatingRatingBadge() {
  return (
    <a
      href="/produkte"
      aria-label="4,8 von 5 Sternen — Kundenbewertungen ansehen"
      className="fixed bottom-4 right-4 z-40 hidden flex-col items-center gap-0.5 rounded-lg border border-border bg-card px-4 py-3 shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:flex"
    >
      <span className="flex gap-0.5" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="size-3.5 fill-amber-400 text-amber-400" />
        ))}
      </span>
      <span className="text-sm font-bold text-card-foreground">4,8</span>
      <span className="text-[10px] text-muted-foreground">Hervorragend</span>
    </a>
  )
}
