// Purpose: Order summary sidebar — subtotal, shipping, free-shipping progress,
// coupon input, estimated delivery, trust badges

'use client'

import { CheckoutButton } from '@/components/CheckoutButton'
import { TrustBadges } from '@/components/conversion/trust-badges'
import {
  CouponCodeSection,
  DeliveryEstimate,
  FreeShippingProgress,
  PriceBreakdown,
} from './cart-summary-sections'

export function CartSummary({
  subtotalCents,
  shippingCents,
  grandTotalCents,
  freeShippingProgress,
  qualifiesForFreeShipping,
  missingForFreeCents,
}: {
  subtotalCents: number
  shippingCents: number
  grandTotalCents: number
  freeShippingProgress: number
  qualifiesForFreeShipping: boolean
  missingForFreeCents: number
}) {
  return (
    <aside className="h-fit rounded-lg border border-border bg-card p-6 lg:sticky lg:top-20">
      <h2 className="mb-4 text-lg font-semibold">Zusammenfassung</h2>
      <FreeShippingProgress progress={freeShippingProgress} qualifies={qualifiesForFreeShipping} missingCents={missingForFreeCents} />
      <PriceBreakdown subtotalCents={subtotalCents} shippingCents={shippingCents} totalCents={grandTotalCents} />
      <CouponCodeSection />
      <DeliveryEstimate />
      <p className="mb-4 text-xs text-muted-foreground">Endpreise in EUR. Versandkosten werden separat ausgewiesen.</p>
      <div className="hidden lg:block"><CheckoutButton /><div className="mt-3"><TrustBadges /></div></div>
    </aside>
  )
}
