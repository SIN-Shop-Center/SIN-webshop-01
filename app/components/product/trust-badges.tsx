'use client'

import { TruckIcon, ShieldCheckIcon, RotateCcwIcon } from '@/components/icons'
import { Clock, CreditCard } from 'lucide-react'

const BADGES = [
  { icon: TruckIcon, label: 'Kostenloser Versand ab 50\u00a0€' },
  { icon: RotateCcwIcon, label: '30 Tage Rückgaberecht' },
  { icon: ShieldCheckIcon, label: 'Sichere Bezahlung' },
  { icon: Clock, label: '7\u201315 Tage Lieferung' },
] as const

const PAYMENT_LOGOS = ['Visa', 'Mastercard', 'Stripe'] as const

export function TrustBadges() {
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex gap-4 overflow-x-auto pb-1 sm:gap-6 sm:overflow-visible">
        {BADGES.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground"
          >
            <Icon className="size-4 shrink-0 text-primary" aria-hidden />
            <span>{label}</span>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <CreditCard className="size-3.5 shrink-0" aria-hidden />
        <span className="shrink-0">Zahlungsarten:</span>
        <ul className="flex items-center gap-2" aria-label="Akzeptierte Zahlungsarten">
          {PAYMENT_LOGOS.map((name) => (
            <li
              key={name}
              className="rounded border border-border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            >
              {name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
