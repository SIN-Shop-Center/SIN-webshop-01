// Purpose: Central shipping configuration (Step 9 of migration)
// Docs: PLAN-VERKAUFSFAEHIG.md (Step 9 — Customer orders + shipping)
//
// Single source of truth for shipping costs and delivery times.
// Used by:
//   - app/lib/actions/checkout.ts (Stripe shipping_options)
//   - app/warenkorb/page.tsx (summary + free-shipping nudge)
//   - app/versand/page.tsx (legal disclosure)
//
// Anpassen: 4,99 € Standard, Gratisversand ab 49 € sind Vorschläge.
// Prüfe, dass die Marge den Versand trägt.

export const SHIPPING = {
  standardCents: 499, // 4,99 €
  freeAboveCents: 4900, // Gratisversand ab 49 €
  deliveryDaysMin: 7,
  deliveryDaysMax: 15,
} as const

export function getShippingCents(subtotalCents: number): number {
  return subtotalCents >= SHIPPING.freeAboveCents ? 0 : SHIPPING.standardCents
}
