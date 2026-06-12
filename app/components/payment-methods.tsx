// app/components/payment-methods.tsx
// Purpose: Zahlarten-Anzeige für den Footer — Vertrauenssignal.

import { CreditCard, Smartphone, Landmark, ShieldCheck } from 'lucide-react'

const METHODS = [
  { icon: CreditCard, label: 'Visa & Mastercard' },
  { icon: Smartphone, label: 'Apple Pay & Google Pay' },
  { icon: Landmark, label: 'Klarna' },
  { icon: ShieldCheck, label: 'Stripe-gesichert' },
] as const

export function PaymentMethods() {
  return (
    <div aria-label="Akzeptierte Zahlungsarten" className="border-t border-border pt-6">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Sicher bezahlen mit
      </p>
      <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {METHODS.map((m) => (
          <li key={m.label} className="flex items-center gap-2 text-sm text-muted-foreground">
            <m.icon className="size-4" aria-hidden="true" />
            {m.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
