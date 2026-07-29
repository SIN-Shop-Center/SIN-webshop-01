// Purpose: Compact rating summary under PDP title with jump-to-reviews link
// Docs: AGENTS.md

import { Star } from 'lucide-react'

export function RatingSummary({
  rating,
  ratingCount,
  soldCount,
}: {
  rating: number
  ratingCount: number
  soldCount?: number
}) {
  if (ratingCount === 0) return null

  return (
    <a
      href="#reviews-heading"
      className="flex w-fit items-center gap-2 text-sm hover:underline"
      aria-label={`${rating.toFixed(1)} von 5 Sternen, ${ratingCount} Bewertungen anzeigen`}
    >
      <span className="flex" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`size-4 ${
              i <= Math.round(rating)
                ? 'fill-rating text-rating'
                : 'text-border'
            }`}
          />
        ))}
      </span>
      <span className="font-medium">{rating.toFixed(1)}</span>
      <span className="text-muted-foreground">
        ({ratingCount} {ratingCount === 1 ? 'Bewertung' : 'Bewertungen'})
      </span>
      {soldCount != null && soldCount >= 50 && (
        <span className="text-muted-foreground">
          &middot; {soldCount >= 1000 ? `${Math.floor(soldCount / 1000)}K+` : `${soldCount}+`} verkauft
        </span>
      )}
    </a>
  )
}
