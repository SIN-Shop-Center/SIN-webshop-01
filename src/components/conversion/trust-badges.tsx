// Purpose: Trust badges for checkout
// Docs: AGENTS.md

import { ShieldCheck, RotateCcw, Lock, CreditCard } from 'lucide-react'

const badges = [
  { icon: Lock, label: 'SSL-verschlüsselt' },
  { icon: CreditCard, label: 'Sichere Zahlung über Stripe' },
  { icon: RotateCcw, label: '14 Tage Widerrufsrecht' },
  { icon: ShieldCheck, label: 'Käuferschutz' },
]

export function TrustBadges() {
  return (
    <ul className="grid grid-cols-2 gap-2">
      {badges.map((badge) => (
        <li key={badge.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <badge.icon className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
          {badge.label}
        </li>
      ))}
    </ul>
  )
}
