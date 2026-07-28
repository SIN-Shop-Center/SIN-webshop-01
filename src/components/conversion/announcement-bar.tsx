// Purpose: Rotating announcement bar mit kopierbarem Gutscheincode
// (doktorabc-Pattern: Code anklicken → in Zwischenablage)
// Docs: AGENTS.md

'use client'

import { useEffect, useState } from 'react'

const COUPON = 'WILLKOMMEN10'

const messages = [
  { text: 'Gratisversand ab 49 € — nur für kurze Zeit' },
  { text: '10 % Rabatt auf deine erste Bestellung mit Code', coupon: COUPON },
  { text: 'Täglich neue Blitzangebote — bis zu 50 % sparen' },
  { text: '14 Tage Widerrufsrecht und Käuferschutz' },
] as const

export function AnnouncementBar() {
  const [index, setIndex] = useState(0)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (copied) return // Rotation pausieren, solange "Kopiert!" sichtbar ist
    const interval = setInterval(() => setIndex((i) => (i + 1) % messages.length), 4500)
    return () => clearInterval(interval)
  }, [copied])

  async function copyCoupon() {
    try {
      await navigator.clipboard.writeText(COUPON)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard nicht verfügbar (z. B. http) — still ignorieren
    }
  }

  const current = messages[index]

  return (
    <div
      className="bg-foreground py-2 text-center shadow-sm"
      role="status"
      aria-live="polite"
    >
      <p className="flex flex-wrap items-center justify-center gap-2 px-4 text-xs font-semibold text-background sm:text-sm">
        {current.text}
        {'coupon' in current && current.coupon && (
          <button
            type="button"
            onClick={copyCoupon}
            aria-label={`Gutscheincode ${current.coupon} kopieren`}
            className="rounded-md border border-background/40 bg-background/10 px-2 py-0.5 font-mono font-bold tracking-wide text-background transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {copied ? 'Kopiert!' : current.coupon}
          </button>
        )}
      </p>
    </div>
  )
}
