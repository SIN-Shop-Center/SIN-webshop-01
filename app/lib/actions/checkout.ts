// Purpose: Stripe Checkout Server Action mit granularem Error-Logging
// Docs: AGENTS.md

'use server'

import { cookies } from 'next/headers'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { getCartItems } from '@/lib/actions/cart'
import { getProductsByIds } from '@/lib/queries'
import { createClient } from '@/lib/supabase/server'
import { SHIPPING, getShippingQuoteAsync, getShippingCents } from '@/lib/shipping'
import { toCents } from '@/lib/format'

type CheckoutResult = { url?: string; error?: string }

const GENERIC_ERROR =
  'Beim Starten der Zahlung ist ein Fehler aufgetreten. Bitte versuche es erneut.'

export async function startCheckout(): Promise<CheckoutResult> {
  // 1. Konfiguration prüfen
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('[checkout] STRIPE_SECRET_KEY is not set')
    return {
      error:
        'Die Kasse ist vorübergehend nicht verfügbar. Bitte versuche es später erneut.',
    }
  }

  // 2. Warenkorb laden
  let items: Awaited<ReturnType<typeof getCartItems>>
  try {
    items = await getCartItems()
  } catch (err) {
    console.error('[checkout] getCartItems failed:', err)
    return { error: GENERIC_ERROR }
  }
  if (items.length === 0) return { error: 'Dein Warenkorb ist leer.' }

  // 3. Produkte + Preise SERVERSEITIG laden
  let products: Awaited<ReturnType<typeof getProductsByIds>>
  try {
    products = await getProductsByIds(items.map((i) => i.product_id))
  } catch (err) {
    console.error('[checkout] getProductsByIds failed:', err)
    return { error: GENERIC_ERROR }
  }
  const productMap = new Map(products.map((p) => [p.id, p]))

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []
  let subtotalCents = 0

  for (const item of items) {
    const product = productMap.get(item.product_id)
    // Issue #37: Stock ist bereits via reserve_stock reserviert — nur Existenz prüfen.
    // NICHT gegen product.stock prüfen: das letzte reservierte Stück hätte stock=0.
    if (!product) continue

    const unitAmount = toCents(product.price)
    if (!Number.isInteger(unitAmount) || unitAmount < 50) {
      console.error(
        `[checkout] invalid unit_amount ${unitAmount} for product ${product.id} (${product.title})`,
      )
      continue
    }

    // Issue #37: Reservierung ist bereits im Warenkorb. Kein Clamp auf product.stock.
    const quantity = item.quantity
    subtotalCents += unitAmount * quantity

    lineItems.push({
      price_data: {
        currency: 'eur',
        product_data: {
          name: product.title.slice(0, 250),
          metadata: { product_id: product.id },
        },
        unit_amount: unitAmount,
      },
      quantity,
    })
  }

  if (lineItems.length === 0) {
    return { error: 'Keine verfügbaren Produkte im Warenkorb.' }
  }

  // 4. Eingeloggten User ermitteln (optional)
  let userEmail: string | undefined
  let userId = ''
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    userEmail = user?.email ?? undefined
    userId = user?.id ?? ''
  } catch (err) {
    console.error('[checkout] supabase.auth.getUser failed (continuing as guest):', err)
  }

  const cookieStore = await cookies()
  const cartId = cookieStore.get('sin_cart_id')?.value ?? ''
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://shopsin.delqhi.com'

  // 5. Versandkosten — CJ-Quote darf den Checkout NIEMALS crashen
  let shipping: { costCents: number; agingMin: number; agingMax: number } = {
    costCents: getShippingCents(subtotalCents),
    agingMin: SHIPPING.deliveryDaysMin,
    agingMax: SHIPPING.deliveryDaysMax,
  }
  try {
    const cjItems = items
      .map((i) => {
        const p = productMap.get(i.product_id)
        if (!p?.variants?.length) return null
        const v = i.variant_id
          ? p.variants.find((v) => v.cj_variant_id === i.variant_id)
          : p.variants[0]
        return v?.cj_variant_id
          ? { cj_variant_id: v.cj_variant_id, quantity: i.quantity }
          : null
      })
      .filter((x): x is { cj_variant_id: string; quantity: number } => x !== null)

    if (cjItems.length > 0) {
      shipping = await getShippingQuoteAsync({ items: cjItems, subtotalCents })
    }
  } catch (err) {
    console.error('[checkout] shipping quote failed, using flat fallback:', err)
  }

  // 6. Stripe-Session erstellen
  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      success_url: `${appUrl}/checkout/erfolg?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/kasse/abgebrochen`,
      customer_email: userEmail,
      metadata: { user_id: userId, cart_id: cartId },
      phone_number_collection: { enabled: true },
      shipping_address_collection: {
        allowed_countries: ['DE', 'AT', 'CH'],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            display_name:
              shipping.costCents === 0 ? 'Kostenloser Versand' : 'Standardversand',
            fixed_amount: { amount: shipping.costCents, currency: 'eur' },
            delivery_estimate: {
              minimum: { unit: 'business_day', value: shipping.agingMin },
              maximum: { unit: 'business_day', value: shipping.agingMax },
            },
          },
        },
      ],
    })

    if (!session.url) {
      console.error('[checkout] session created but url missing', session.id)
      return { error: 'Stripe-Sitzung konnte nicht erstellt werden.' }
    }
    return { url: session.url }
  } catch (err) {
    if (err instanceof Stripe.errors.StripeError) {
      console.error(
        `[checkout] StripeError type=${err.type} code=${err.code ?? 'n/a'} message=${err.message}`,
      )
      if (err.type === 'StripeAuthenticationError') {
        return {
          error:
            'Die Kasse ist vorübergehend nicht verfügbar. Bitte versuche es später erneut.',
        }
      }
    } else {
      console.error('[checkout] unexpected error:', err)
    }
    return { error: GENERIC_ERROR }
  }
}
