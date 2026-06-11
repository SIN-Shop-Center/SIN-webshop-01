// Purpose: Stripe Checkout Server Action (Step 4 + Step 9 shipping)
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)

'use server'

import { redirect } from 'next/navigation'
import { getStripe } from '@/lib/stripe'
import { getCartItems } from '@/lib/actions/cart'
import { getProductById } from '@/lib/queries'
import { createClient } from '@/lib/supabase/server'
import { SHIPPING, getShippingCents } from '@/lib/shipping'

export async function startCheckout() {
  const items = await getCartItems()
  if (items.length === 0) redirect('/warenkorb')

  // Preise IMMER aus der DB — niemals vom Client
  const lineItems = []
  let subtotalCents = 0

  for (const item of items) {
    const product = await getProductById(item.product_id)
    if (!product || product.stock <= 0) continue

    const unitAmount = Math.round(Number(product.price) * 100)
    const quantity = Math.min(item.quantity, product.stock)
    subtotalCents += unitAmount * quantity

    lineItems.push({
      price_data: {
        currency: 'eur',
        product_data: {
          name: product.title,
          metadata: { product_id: product.id },
        },
        unit_amount: unitAmount,
      },
      quantity,
    })
  }

  if (lineItems.length === 0) redirect('/warenkorb')

  // Eingeloggten User mitgeben (optional, für Bestellzuordnung)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const shippingCents = getShippingCents(subtotalCents)

  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    success_url: `${appUrl}/kasse/erfolg?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/warenkorb`,
    customer_email: user?.email ?? undefined,
    metadata: {
      user_id: user?.id ?? '',
    },
    // CJ Dropshipping verlangt eine Telefonnummer für den Versand
    phone_number_collection: { enabled: true },
    shipping_address_collection: {
      allowed_countries: ['DE', 'AT', 'CH'],
    },
    // Versandkosten aus app/lib/shipping.ts
    shipping_options: [
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          display_name:
            shippingCents === 0 ? 'Kostenloser Versand' : 'Standardversand',
          fixed_amount: { amount: shippingCents, currency: 'eur' },
          delivery_estimate: {
            minimum: { unit: 'business_day', value: SHIPPING.deliveryDaysMin },
            maximum: { unit: 'business_day', value: SHIPPING.deliveryDaysMax },
          },
        },
      },
    ],
  })

  redirect(session.url!)
}
