// Purpose: Stripe Checkout Server Action (Step 4 + Step 9 shipping)
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)

'use server'

import { cookies } from 'next/headers'
import { getStripe } from '@/lib/stripe'
import { getCartItems } from '@/lib/actions/cart'
import { getProductsByIds } from '@/lib/queries'
import { createClient } from '@/lib/supabase/server'
import { SHIPPING, getShippingQuoteAsync, getShippingCents } from '@/lib/shipping'
import { toCents } from '@/lib/format'

export async function startCheckout(): Promise<{ url?: string; error?: string }> {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('[checkout] STRIPE_SECRET_KEY is not set')
      return { error: 'Die Kasse ist vorübergehend nicht verfügbar. Bitte versuche es später erneut.' }
    }

    const items = await getCartItems()
    if (items.length === 0) return { error: 'Dein Warenkorb ist leer.' }

    // Preise IMMER aus der DB — niemals vom Client.
    // Batch-Query statt N+1: ein Roundtrip für alle Produkte.
    const products = await getProductsByIds(items.map((i) => i.product_id))
    const productMap = new Map(products.map((p) => [p.id, p]))

    const lineItems = []
    let subtotalCents = 0

    for (const item of items) {
      const product = productMap.get(item.product_id)
      if (!product || product.stock <= 0) continue

      const unitAmount = toCents(product.price)
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

    if (lineItems.length === 0) return { error: 'Keine verfügbaren Produkte im Warenkorb.' }

    // Eingeloggten User mitgeben (optional, für Bestellzuordnung)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // cart_id mitgeben, damit der Stripe-Webhook den Warenkorb nach
    // erfolgreicher Zahlung serverseitig leeren kann (statt als
    // Render-Seiteneffekt auf der Erfolgsseite).
    const cookieStore = await cookies()
    const cartId = cookieStore.get('sin_cart_id')?.value ?? ''

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://shopsin.delqhi.com'

    // Dynamische Versandkosten via CJ-Fracht (Fallback auf Flat 4,99 €)
    const cjItems = items
      .map((i) => {
        const p = productMap.get(i.product_id)
        if (!p?.variants?.length) return null
        const v = i.variant_id ? p.variants.find((v) => v.cj_variant_id === i.variant_id) : p.variants[0]
        return v?.cj_variant_id ? { cj_variant_id: v.cj_variant_id, quantity: i.quantity } : null
      })
      .filter((x): x is { cj_variant_id: string; quantity: number } => x !== null)
    const shipping = cjItems.length > 0
      ? await getShippingQuoteAsync({ items: cjItems, subtotalCents })
      : { costCents: getShippingCents(subtotalCents), agingMin: SHIPPING.deliveryDaysMin, agingMax: SHIPPING.deliveryDaysMax }

    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      success_url: `${appUrl}/checkout/erfolg?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/kasse/abgebrochen`,
      customer_email: user?.email ?? undefined,
      metadata: {
        user_id: user?.id ?? '',
        cart_id: cartId,
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

    if (!session.url) return { error: 'Stripe-Sitzung konnte nicht erstellt werden.' }
    return { url: session.url }
  } catch (err) {
    console.error('[checkout] Fehler:', err)
    return { error: 'Beim Starten der Zahlung ist ein Fehler aufgetreten. Bitte versuche es erneut.' }
  }
}
