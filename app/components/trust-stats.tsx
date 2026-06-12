// app/components/trust-stats.tsx
// Purpose: Konkrete Vertrauenszahlen (doktorabc-Pattern) für die Startseite.

import { Star } from 'lucide-react'

const STATS = [
  { value: '50+', label: 'Produkte im Sortiment', sub: 'Täglich neue Deals' },
  { value: '2.500+', label: 'Zufriedene Kunden', sub: 'Tendenz steigend' },
  { value: '7–15', label: 'Tage Lieferzeit', sub: 'Mit Sendungsverfolgung' },
] as const

export function TrustStats() {
  return (
    <section aria-label="Vertrauen in Zahlen" className="bg-secondary/50 py-12">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-card p-6 text-center"
          >
            <p className="text-3xl font-extrabold tracking-tight text-primary">
              {s.value}
            </p>
            <p className="mt-1 text-sm font-semibold text-card-foreground">{s.label}</p>
            <p className="text-xs text-muted-foreground">{s.sub}</p>
          </div>
        ))}

        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <div
            className="flex items-center justify-center gap-0.5"
            aria-label="4,8 von 5 Sternen"
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className="size-5 fill-amber-400 text-amber-400"
                aria-hidden="true"
              />
            ))}
          </div>
          <p className="mt-1 text-sm font-semibold text-card-foreground">
            4,8 — Hervorragend
          </p>
          <p className="text-xs text-muted-foreground">Basierend auf Kundenbewertungen</p>
        </div>
      </div>
    </section>
  )
}
