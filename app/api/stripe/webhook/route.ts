// Purpose: Stripe webhook — order insert + Resend confirmation + CJ forwarding
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26, Step 7)
//
// Idempotenz: Der Insert wird atomar am UNIQUE-Constraint
// (stripe_session_id) abgewiesen — kein select-then-insert Race.
// Voraussetzung: scripts/supabase/setup-idempotency.sql ausgeführt.

import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendOrderConfirmation } from '@/lib/emails/send'
import { submitOrderToCj } from '@/lib/fulfillment/submit-order'

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
    const shippingDetails = session.collected_information?.shipping_details
    const shipping = shippingDetails
      ? {
          name: shippingDetails.name ?? null,
          address: shippingDetails.address ?? null,
          phone: session.customer_details?.phone ?? null,
        }
      : null

    // Issue #54: Event-Level-Replay-Schutz. Wenn der gleiche Stripe-Event
    // doppelt eintrifft, schlägt der Insert fehl (Code 23505) und wir
    // antworten 200, ohne nochmal zu verarbeiten.
    const { error: eventDupeError } = await supabase
      .from('processed_events')
      .insert({ event_id: event.id, type: event.type })

    if (eventDupeError?.code === '23505') {
      return NextResponse.json({ received: true, duplicate: true })
    }
    if (eventDupeError) {
      console.error('processed_events insert failed:', eventDupeError)
      return NextResponse.json({ error: 'db error' }, { status: 500 })
    }

    // ATOMARE Idempotenz: Insert schlägt bei doppelter Zustellung am
    // Unique-Constraint fehl (Code 23505) statt eine zweite Order anzulegen.
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

    const isDuplicate = error?.code === '23505'

    if (error && !isDuplicate) {
      console.error('Order insert failed:', error)
      return NextResponse.json({ error: 'Order insert failed' }, { status: 500 })
    }

    if (!isDuplicate && order) {
      // Warenkorb serverseitig leeren — läuft genau einmal pro Zahlung
      const cartId = session.metadata?.cart_id
      if (cartId) {
        await supabase.from('cart_items').delete().eq('cart_id', cartId)
      }

      // 1) Bestätigungsmail (fire-and-forget — Fehler blockieren Checkout nicht)
      sendOrderConfirmation(order.id).catch((e) =>
        console.error('Order confirmation email failed:', e),
      )

      // 2) Order an CJ weiterleiten (Fehler blockieren Checkout nicht)
      const result = await submitOrderToCj(order.id)
      if (!result.ok) {
        console.error('CJ order forwarding failed:', result.error)
      }
    }
  }

  return NextResponse.json({ received: true })
}


