// Purpose: Stripe webhook — order insert + Resend confirmation + CJ forwarding
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26, Step 7)

import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendOrderConfirmation } from '@/lib/email'
import { createCjOrder } from '@/lib/cj/orders'

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    )
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const supabase = createAdminClient()

    // Idempotenz: Session schon verarbeitet?
    const { data: existing } = await supabase
      .from('orders')
      .select('id')
      .eq('stripe_session_id', session.id)
      .maybeSingle()

    if (!existing) {
      const lineItems = await getStripe().checkout.sessions.listLineItems(session.id, {
        limit: 100,
        expand: ['data.price.product'],
      })

      const items = lineItems.data.map((li) => {
        const product = li.price?.product as Stripe.Product | undefined
        return {
          product_id: product?.metadata?.product_id ?? '',
          title: li.description ?? 'Artikel',
          quantity: li.quantity ?? 1,
          unit_amount: li.price?.unit_amount ?? 0,
        }
      })

      const email = session.customer_details?.email ?? session.customer_email ?? ''
      // Build a minimal shipping object from the Stripe session.
      // Note: phone is collected via phone_number_collection on the session
      // and lives on customer_details (not on shipping_details).
      const shippingDetails = session.collected_information?.shipping_details
      const shipping = shippingDetails
        ? {
            name: shippingDetails.name ?? null,
            address: shippingDetails.address ?? null,
            phone: session.customer_details?.phone ?? null,
          }
        : null

      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          stripe_session_id: session.id,
          email,
          amount_total: session.amount_total ?? 0,
          currency: session.currency ?? 'eur',
          status: 'paid',
          items,
          user_id: session.metadata?.user_id || null,
          shipping_address: shipping,
          fulfillment_status: 'pending',
        })
        .select('id')
        .single()

      if (!error && order) {
        // 1) Bestätigungsmail (Fehler nicht eskalieren)
        if (email) {
          try {
            await sendOrderConfirmation({
              to: email,
              orderId: order.id,
              items,
              totalCents: session.amount_total ?? 0,
            })
          } catch (e) {
            console.error('Order confirmation email failed:', e)
          }
        }

        // 2) Order an CJ weiterleiten
        try {
          await forwardOrderToCj(supabase, order.id, items, shipping, email)
        } catch (e) {
          console.error('CJ order forwarding failed:', e)
          await supabase
            .from('orders')
            .update({ fulfillment_status: 'failed' })
            .eq('id', order.id)
          // Bewusst kein Fehler-Response: Stripe soll nicht endlos retrien.
          // 'failed'-Orders werden vom Cron manuell geprüft (Block 6).
        }
      }
    }
  }

  return NextResponse.json({ received: true })
}

interface OrderItem {
  product_id: string
  title: string
  quantity: number
  unit_amount: number
}

interface MinimalShipping {
  name: string | null
  address: Stripe.Address | null
  phone: string | null
}

async function forwardOrderToCj(
  supabase: ReturnType<typeof createAdminClient>,
  orderId: string,
  items: OrderItem[],
  shipping: MinimalShipping | null,
  email: string,
) {
  if (!shipping?.address) {
    throw new Error('No shipping address on session')
  }

  // CJ-Varianten-IDs zu den bestellten Produkten auflösen
  const productIds = items.map((i) => i.product_id).filter((x): x is string => !!x)
  const { data: products } = await supabase
    .from('products')
    .select('id, cj_variant_id')
    .in('id', productIds)

  const cjProducts = items
    .map((item) => {
      const match = products?.find((p) => p.id === item.product_id)
      return match?.cj_variant_id
        ? { vid: match.cj_variant_id, quantity: item.quantity }
        : null
    })
    .filter((x): x is { vid: string; quantity: number } => x !== null)

  if (cjProducts.length === 0) {
    throw new Error('No CJ variants found for order items')
  }

  const addr = shipping.address
  const { cjOrderId } = await createCjOrder({
    orderNumber: orderId,
    shipping: {
      name: shipping.name ?? 'Kunde',
      phone:
        shipping.phone ??
        // Stripe liefert standardmäßig keine Tel.-Nr. — fallback auf customer_details
        // (oder über phone_number_collection auf der Session aktivieren — siehe checkout.ts)
        '0000000000',
      email,
      country: addr.country ?? 'DE',
      province: addr.state ?? addr.city ?? '',
      city: addr.city ?? '',
      address: addr.line1 ?? '',
      address2: addr.line2 ?? undefined,
      zip: addr.postal_code ?? '',
    },
    products: cjProducts,
  })

  await supabase
    .from('orders')
    .update({
      cj_order_id: cjOrderId,
      cj_order_status: 'CREATED',
      fulfillment_status: 'forwarded',
    })
    .eq('id', orderId)
}
