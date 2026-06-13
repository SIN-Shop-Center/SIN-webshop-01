// Purpose: Shipping method selector — Standardversand (CJ dropshipping)
// Docs: PLAN-VERKAUFSFAEHIG.md

'use client'

import { useState } from 'react'
import { SHIPPING } from '@/lib/shipping-constants'
import { formatEuro } from '@/lib/format'
import { TruckIcon, ClockIcon, CheckCircleIcon } from 'lucide-react'

interface ShippingOption {
  id: string
  label: string
  description: string
  priceCents: number
  agingMin: number
  agingMax: number
}

const STANDARD_OPTION: ShippingOption = {
  id: 'standard',
  label: 'Standardversand',
  description: 'CJ Dropshipping — zuverlässige Lieferung',
  priceCents: SHIPPING.standardCents,
  agingMin: SHIPPING.deliveryDaysMin,
  agingMax: SHIPPING.deliveryDaysMax,
}

function getDeliveryRange(
  min: number,
  max: number,
): { min: string; max: string } {
  const now = new Date()
  const dMin = new Date(now)
  const dMax = new Date(now)
  let aMin = 0
  let aMax = 0
  while (aMin < min) {
    dMin.setDate(dMin.getDate() + 1)
    if (dMin.getDay() !== 0 && dMin.getDay() !== 6) aMin++
  }
  while (aMax < max) {
    dMax.setDate(dMax.getDate() + 1)
    if (dMax.getDay() !== 0 && dMax.getDay() !== 6) aMax++
  }
  const fmt = (d: Date) =>
    d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })
  return { min: fmt(dMin), max: fmt(dMax) }
}

export function ShippingMethodSelector({
  subtotalCents,
  onSelect,
}: {
  subtotalCents: number
  onSelect: (method: ShippingOption) => void
}) {
  const [selected, setSelected] = useState(STANDARD_OPTION.id)

  const effectivePrice =
    subtotalCents >= SHIPPING.freeAboveCents ? 0 : STANDARD_OPTION.priceCents
  const delivery = getDeliveryRange(
    STANDARD_OPTION.agingMin,
    STANDARD_OPTION.agingMax,
  )

  function handleSelect() {
    setSelected(STANDARD_OPTION.id)
    onSelect({ ...STANDARD_OPTION, priceCents: effectivePrice })
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <TruckIcon className="size-5" aria-hidden />
        Versandart
      </h3>

      <label
        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
          selected === STANDARD_OPTION.id
            ? 'border-[#047857] bg-[#047857]/5'
            : 'border-border hover:border-muted-foreground'
        }`}
      >
        <input
          type="radio"
          name="shipping-method"
          value={STANDARD_OPTION.id}
          checked={selected === STANDARD_OPTION.id}
          onChange={handleSelect}
          className="mt-1 size-4 accent-[#047857]"
        />
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold">{STANDARD_OPTION.label}</span>
            <span className="font-semibold tabular-nums">
              {effectivePrice === 0 ? 'Kostenlos' : formatEuro(effectivePrice)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {STANDARD_OPTION.description}
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <ClockIcon className="size-3.5 shrink-0" aria-hidden />
            <span>
              {STANDARD_OPTION.agingMin}–{STANDARD_OPTION.agingMax} Werktage ·{' '}
              <span className="font-medium text-foreground">
                {delivery.min} – {delivery.max}
              </span>
            </span>
          </div>
          {effectivePrice === 0 && (
            <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-success">
              <CheckCircleIcon className="size-3.5 shrink-0" aria-hidden />
              Gratis Versand ab {formatEuro(SHIPPING.freeAboveCents)}
            </div>
          )}
        </div>
      </label>
    </div>
  )
}
