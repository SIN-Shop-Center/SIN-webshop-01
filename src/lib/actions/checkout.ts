// Purpose: Stripe Checkout Server Action mit granularem Error-Logging
// Docs: AGENTS.md

'use server'

import { cookies } from 'next/headers'
import Stripe from 'stripe'
import { getCartItems } from '@/lib/actions/cart'
import {
  buildCheckoutLineItems,
  resolveCheckoutAppUrl,
  resolveCheckoutShipping,
} from '@/lib/checkout/session-input'
import { getProductsByIds } from '@/lib/queries'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

type CheckoutResult = { url?: string; error?: string }

const GENERIC_ERROR =
  'Beim Starten der Zahlung ist ein Fehler aufgetreten. Bitte versuche es erneut.'
const UNAVAILABLE_ERROR =
  'Die Kasse ist vorübergehend nicht verfügbar. Bitte versuche es später erneut.'

export async function startCheckout(): Promise<CheckoutResult> {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('[checkout] STRIPE_SECRET_KEY is not set')
    return { error: UNAVAILABLE_ERROR }
  }

  const appUrl = resolveCheckoutAppUrl()
  if (!appUrl) return { error: UNAVAILABLE_ERROR }

  let items: Awaited<ReturnType<typeof getCartItems>>
  try {
    items = await getCartItems()
  } catch (error) {
    console.error('[checkout] getCartItems failed:', error)
    return { error: GENERIC_ERROR }
  }
  if (items.length === 0) return { error: 'Dein Warenkorb ist leer.' }

  let products: Awaited<ReturnType<typeof getProductsByIds>>
  try {
    products = await getProductsByIds(items.map((item) => item.product_id))
  } catch (error) {
    console.error('[checkout] getProductsByIds failed:', error)
    return { error: GENERIC_ERROR }
  }

  const built = buildCheckoutLineItems(items, products)
  if ('error' in built) return { error: built.error }

  let userEmail: string | undefined
  let userId = ''
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    userEmail = user?.email ?? undefined
    userId = user?.id ?? ''
  } catch (error) {
    console.error('[checkout] supabase.auth.getUser failed (continuing as guest):', error)
  }

  const cookieStore = await cookies()
  const cartId = cookieStore.get('sin_cart_id')?.value ?? ''
  if (!cartId) {
    console.error('[checkout] cart cookie missing after cart lookup')
    return { error: 'Der Warenkorb konnte nicht eindeutig zugeordnet werden.' }
  }

  const shipping = await resolveCheckoutShipping(items, built.productMap, built.subtotalCents)

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      line_items: built.lineItems,
      success_url: `${appUrl}/kasse/erfolg?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/kasse/abgebrochen`,
      customer_email: userEmail,
      metadata: { user_id: userId, cart_id: cartId },
      phone_number_collection: { enabled: true },
      shipping_address_collection: { allowed_countries: ['DE'] },
      shipping_options: [{
        shipping_rate_data: {
          type: 'fixed_amount',
          display_name: shipping.costCents === 0 ? 'Kostenloser Versand' : 'Standardversand',
          fixed_amount: { amount: shipping.costCents, currency: 'eur' },
          delivery_estimate: {
            minimum: { unit: 'business_day', value: shipping.agingMin },
            maximum: { unit: 'business_day', value: shipping.agingMax },
          },
        },
      }],
    })

    if (!session.url) {
      console.error('[checkout] session created but url missing', session.id)
      return { error: 'Stripe-Sitzung konnte nicht erstellt werden.' }
    }
    return { url: session.url }
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      console.error(`[checkout] StripeError type=${error.type} code=${error.code ?? 'n/a'} message=${error.message}`)
      if (error.type === 'StripeAuthenticationError') return { error: UNAVAILABLE_ERROR }
    } else {
      console.error('[checkout] unexpected error:', error)
    }
    return { error: GENERIC_ERROR }
  }
}
