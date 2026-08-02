import { Truck } from 'lucide-react'
import { SHIPPING } from '@/lib/shipping-constants'
import { formatEuro } from '@/lib/format'

export function FreeShippingNudge() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-4">
      <Truck className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={1.8} aria-hidden />
      <div>
        <p className="text-sm font-semibold">
          Versandfrei ab {formatEuro(SHIPPING.freeAboveCents)}
        </p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Unterhalb des Schwellenwerts werden die aktuellen Versandkosten im Checkout ausgewiesen.
        </p>
      </div>
    </div>
  )
}
