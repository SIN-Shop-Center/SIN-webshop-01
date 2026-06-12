// Purpose: Rotating announcement bar above header
// Docs: AGENTS.md

'use client'

import { useEffect, useState } from 'react'

const messages = [
  'Gratisversand ab 49 € — nur für kurze Zeit',
  '10 % Rabatt auf deine erste Bestellung mit Code WILLKOMMEN10',
  'Täglich neue Blitzangebote — bis zu 50 % sparen',
  '14 Tage Widerrufsrecht und Käuferschutz',
]

export function AnnouncementBar() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setIndex((i) => (i + 1) % messages.length), 4500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="bg-foreground py-1.5 text-center" role="status" aria-live="polite">
      <p className="px-4 text-xs font-medium text-background">{messages[index]}</p>
    </div>
  )
}
