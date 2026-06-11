// Purpose: Stripe Checkout Server Action (Step 4 of migration)
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)

'use server'

import { redirect } from 'next/navigation'
import { getStripe } from '@/lib/stripe'
import { getCartItems } from '@/lib/actions/cart'
import { getProductById } from '@/lib/queries'
import { createClient } from '@/lib/supabase/server'

export async function startCheckout() {
  const items = await getCartItems()
  if (items.length === 0) redirect('/warenkorb')

  // Preise IMMER aus der DB — niemals vom Client
  const lineItems = []
  for (const item of items) {
    const product = await getProductById(item.product_id)
    if (!product || product.stock <= 0) continue

    lineItems.push({
      price_data: {
        currency: 'eur',
        product_data: {
          name: product.title,
          metadata: { product_id: product.id },
        },
        unit_amount: Math.round(Number(product.price) * 100),
      },
      quantity: Math.min(item.quantity, product.stock),
    })
  }

  if (lineItems.length === 0) redirect('/warenkorb')

  // Eingeloggten User mitgeben (optional, für Bestellzuordnung)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    success_url: `${appUrl}/kasse/erfolg?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/warenkorb`,
    customer_email: user?.email ?? undefined,
    metadata: {
      user_id: user?.id ?? '',
    },
    shipping_address_collection: {
      allowed_countries: ['DE', 'AT', 'CH'],
    },
  })

  redirect(session.url!)
}
