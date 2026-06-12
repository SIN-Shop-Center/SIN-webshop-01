// Purpose: Show free shipping progress on product page
// Docs: AGENTS.md

'use client'

import { useState, useEffect } from 'react'
import { Truck } from 'lucide-react'

const FREE_SHIPPING_THRESHOLD = 49

function formatEur(value: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value)
}

export function FreeShippingNudge() {
  const [subtotal, setSubtotal] = useState(0)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('sin-cart')
      if (raw) {
        const items = JSON.parse(raw)
        const total = (Array.isArray(items) ? items : []).reduce((s: number, i: any) => s + (Number(i.price) || 0) * (i.quantity || 1), 0)
        setSubtotal(total)
      }
    } catch { /* ignore */ }
  }, [])

  const remaining = FREE_SHIPPING_THRESHOLD - subtotal

  if (remaining <= 0) {
    return (
      <p className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
        <Truck className="size-4" aria-hidden="true" />
        Du hast dir den kostenlosen Versand gesichert!
      </p>
    )
  }

  const percent = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100)

  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-border bg-muted/50 px-3 py-2">
      <p className="flex items-center gap-2 text-sm">
        <Truck className="size-4 text-primary" aria-hidden="true" />
        <span>
          Nur noch <span className="font-bold text-primary">{formatEur(remaining)}</span> bis zum{' '}
          <span className="font-semibold">Gratisversand</span>
        </span>
      </p>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border" aria-hidden="true">
        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
