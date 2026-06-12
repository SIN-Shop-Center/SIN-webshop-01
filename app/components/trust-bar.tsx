import { Truck, RotateCcw, ShieldCheck, CreditCard } from 'lucide-react'

const ITEMS = [
  { icon: Truck, text: 'Gratisversand ab 49 \u20AC' },
  { icon: RotateCcw, text: '14 Tage Widerrufsrecht' },
  { icon: ShieldCheck, text: 'K\u00E4uferschutz inklusive' },
  { icon: CreditCard, text: 'Sichere Bezahlung' },
] as const

export function TrustBar() {
  return (
    <div className="border-b border-border bg-muted">
      <ul className="container mx-auto flex items-center justify-between gap-4 overflow-x-auto px-4 py-2 sm:justify-center sm:gap-10">
        {ITEMS.map(({ icon: Icon, text }) => (
          <li
            key={text}
            className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground"
          >
            <Icon className="size-3.5 text-success" aria-hidden />
            {text}
          </li>
        ))}
      </ul>
    </div>
  )
}
