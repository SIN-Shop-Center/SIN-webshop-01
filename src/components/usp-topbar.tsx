// Purpose: Rotating USP topbar (DoktorABC-style) cycling through shop promises
// Docs: AGENTS.md

'use client'

import { useEffect, useState } from 'react'
import { TruckIcon, ShieldCheckIcon, RotateCcwIcon, StarIcon } from '@/components/icons'

const USPS = [
  { icon: TruckIcon, text: 'Kostenloser Versand ab 49 €' },
  { icon: ShieldCheckIcon, text: 'Sichere Zahlung mit Stripe' },
  { icon: RotateCcwIcon, text: '14 Tage Widerrufsrecht' },
  { icon: StarIcon, text: 'Über 2.500 zufriedene Kunden' },
] as const

const ROTATE_MS = 4000

export function UspTopbar() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % USPS.length)
    }, ROTATE_MS)
    return () => clearInterval(id)
  }, [])

  const current = USPS[index]
  const Icon = current.icon

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 bg-primary px-4 py-2 text-primary-foreground"
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <p key={index} className="animate-in fade-in text-xs font-medium sm:text-sm">
        {current.text}
      </p>
    </div>
  )
}
