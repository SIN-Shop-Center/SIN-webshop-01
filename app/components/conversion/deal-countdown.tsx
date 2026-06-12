// Purpose: Countdown timer until midnight for deal urgency
// Docs: AGENTS.md

'use client'

import { useEffect, useState } from 'react'

function getTimeUntilMidnight() {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  const diff = midnight.getTime() - now.getTime()
  return {
    hours: Math.floor(diff / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1000),
  }
}

export function DealCountdown() {
  const [time, setTime] = useState<ReturnType<typeof getTimeUntilMidnight> | null>(null)

  useEffect(() => {
    setTime(getTimeUntilMidnight())
    const interval = setInterval(() => setTime(getTimeUntilMidnight()), 1000)
    return () => clearInterval(interval)
  }, [])

  if (!time) return null

  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div className="flex items-center gap-1.5" aria-label="Angebot endet in">
      <span className="text-xs font-medium text-sale">Endet in</span>
      {[time.hours, time.minutes, time.seconds].map((value, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span className="rounded bg-foreground px-1.5 py-0.5 font-mono text-xs font-bold text-background">
            {pad(value)}
          </span>
          {i < 2 && <span className="text-xs font-bold text-foreground">:</span>}
        </span>
      ))}
    </div>
  )
}
