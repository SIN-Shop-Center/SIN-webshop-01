import { Truck } from 'lucide-react'
import { SHIPPING } from '@/lib/shipping-constants'

export function DeliveryEstimate() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-4">
      <Truck className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={1.8} aria-hidden />
      <div>
        <p className="text-sm font-semibold">Voraussichtliche Lieferzeit</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {SHIPPING.deliveryDaysMin}–{SHIPPING.deliveryDaysMax} Werktage nach erfolgreicher Bestellung.
        </p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Die konkrete Versandart und Lieferprognose werden im Stripe-Checkout angezeigt.
        </p>
      </div>
    </div>
  )
}
