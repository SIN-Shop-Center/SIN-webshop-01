// Purpose: Show reservation countdown timer in cart
// Docs: AGENTS.md

'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

const RESERVE_MINUTES = 15
const STORAGE_KEY = 'cart-reserved-until'

export function CartUrgency({ itemCount }: { itemCount: number }) {
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    if (itemCount === 0) {
      sessionStorage.removeItem(STORAGE_KEY)
      return
    }

    let until = Number(sessionStorage.getItem(STORAGE_KEY))
    if (!until || until < Date.now()) {
      until = Date.now() + RESERVE_MINUTES * 60_000
      sessionStorage.setItem(STORAGE_KEY, String(until))
    }

    const tick = () => setRemaining(Math.max(0, until - Date.now()))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [itemCount])

  if (itemCount === 0 || remaining === null || remaining === 0) return null

  const minutes = Math.floor(remaining / 60_000)
  const seconds = Math.floor((remaining % 60_000) / 1000)

  return (
    <p className="flex items-center gap-2 rounded-md bg-sale/10 px-3 py-2 text-sm font-medium text-sale" role="status">
      <Clock className="size-4 shrink-0" aria-hidden="true" />
      <span>
        Deine Artikel sind für{' '}
        <span className="font-mono font-bold">
          {minutes}:{String(seconds).padStart(2, '0')}
        </span>{' '}
        Minuten reserviert — beliebte Artikel sind schnell vergriffen!
      </span>
    </p>
  )
}
