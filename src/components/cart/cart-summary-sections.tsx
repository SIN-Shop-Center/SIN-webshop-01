'use client'

import { useState, useTransition } from 'react'
import { ClockIcon, GiftIcon, TagIcon, TruckIcon } from 'lucide-react'
import { formatEuro } from '@/lib/format'
import { SHIPPING } from '@/lib/shipping-constants'

export function getEstimatedDelivery(): { min: string; max: string } {
  const addBusinessDays = (days: number) => {
    const date = new Date()
    let added = 0
    while (added < days) {
      date.setDate(date.getDate() + 1)
      if (date.getDay() !== 0 && date.getDay() !== 6) added++
    }
    return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })
  }
  return {
    min: addBusinessDays(SHIPPING.deliveryDaysMin),
    max: addBusinessDays(SHIPPING.deliveryDaysMax),
  }
}

export function FreeShippingProgress({ progress, qualifies, missingCents }: {
  progress: number
  qualifies: boolean
  missingCents: number
}) {
  return (
    <div className={`mb-4 rounded-lg p-3 ${qualifies ? 'bg-success/10' : 'bg-accent/10'}`}>
      {qualifies ? (
        <p className="flex items-center gap-1.5 text-sm font-medium text-success"><GiftIcon className="size-4" aria-hidden />Du erhältst kostenlosen Versand!</p>
      ) : (
        <div className="flex items-start gap-1.5 text-sm"><TruckIcon className="mt-0.5 size-4 shrink-0" aria-hidden /><span>Noch <span className="font-semibold">{formatEuro(missingCents)}</span> bis zum kostenlosen Versand.</span></div>
      )}
      <div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Fortschritt Gratisversand" className="mt-2 h-1.5 overflow-hidden rounded-full bg-background/50">
        <div className={`h-full rounded-full transition-all ${qualifies ? 'bg-success' : 'bg-accent'}`} style={{ width: `${progress}%` }} />
      </div>
      {!qualifies ? <p className="mt-1.5 text-xs text-muted-foreground">Gratis Versand ab {formatEuro(SHIPPING.freeAboveCents)}</p> : null}
    </div>
  )
}

export function PriceBreakdown({ subtotalCents, shippingCents, totalCents }: {
  subtotalCents: number
  shippingCents: number
  totalCents: number
}) {
  return <><dl className="flex flex-col gap-2 border-b border-border pb-4 text-sm">
    <div className="flex justify-between"><dt className="text-muted-foreground">Zwischensumme</dt><dd className="tabular-nums">{formatEuro(subtotalCents)}</dd></div>
    <div className="flex justify-between"><dt className="text-muted-foreground">Versand</dt><dd className="tabular-nums">{shippingCents === 0 ? 'Kostenlos' : formatEuro(shippingCents)}</dd></div>
  </dl><div className="flex justify-between py-4"><span className="font-semibold">Gesamt</span><span className="text-lg font-bold tabular-nums">{formatEuro(totalCents)}</span></div></>
}

export function CouponCodeSection() {
  const [code, setCode] = useState('')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function apply() {
    if (!code.trim()) return
    setError(null)
    startTransition(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600))
      setError('Gutscheincode nicht gefunden.')
    })
  }

  return (
    <div className="mb-4 border-b border-border pb-4">
      <label htmlFor="coupon-input" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium"><TagIcon className="size-4" aria-hidden />Gutscheincode</label>
      <div className="flex gap-2"><input id="coupon-input" type="text" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Code eingeben" className="field-input flex-1" disabled={pending} />
        <button type="button" onClick={apply} disabled={pending || !code.trim()} className="btn btn-outline btn-md shrink-0">{pending ? '…' : 'Anwenden'}</button>
      </div>
      {error ? <p role="alert" className="mt-1.5 text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

export function DeliveryEstimate() {
  const delivery = getEstimatedDelivery()
  return <div className="mb-4 flex items-start gap-2 text-sm text-muted-foreground"><ClockIcon className="mt-0.5 size-4 shrink-0" aria-hidden /><p>Voraussichtliche Lieferung: <span className="font-medium text-foreground">{delivery.min} – {delivery.max}</span></p></div>
}
