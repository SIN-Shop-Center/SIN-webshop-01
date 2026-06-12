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
    <div className="bg-primary py-1.5 text-center" role="status" aria-live="polite">
      <p className="flex items-center justify-center gap-1.5 px-4 text-xs font-medium text-primary-foreground">
        {current.text}
        {'coupon' in current && current.coupon && (
          <button
            type="button"
            onClick={copyCoupon}
            aria-label={`Gutscheincode ${current.coupon} kopieren`}
            className="rounded border border-primary-foreground/40 bg-primary-foreground/10 px-1.5 py-0.5 font-mono font-bold tracking-wide hover:bg-primary-foreground/20"
          >
            {copied ? 'Kopiert!' : current.coupon}
          </button>
        )}
      </p>
    </div>
  )
}
