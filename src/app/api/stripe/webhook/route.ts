// Purpose: Stripe webhook — idempotent order insert + email + CJ forwarding
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26, Step 7)
//
// The orders.stripe_session_id UNIQUE constraint is the source of truth for
// concurrency-safe idempotency. processed_events is audit data only and never
// blocks recovery after a transient order-write failure.

import { NextResponse } from 'next/server'
import type Stripe from 'stripe'

import { sendOrderConfirmation } from '@/lib/emails/send'
import { submitOrderToCj } from '@/lib/fulfillment/submit-order'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'

async function recordProcessedEvent(event: Stripe.Event): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('processed_events')
    .upsert(
      { event_id: event.id, type: event.type },
      { onConflict: 'event_id', ignoreDuplicates: true },
    )

  if (error) console.error('[stripe-webhook] processed_events audit write failed:', error)
}

export async function POST(request: Request) {
  const webhookSecret = String(process.env.STRIPE_WEBHOOK_SECRET || '').trim()
  if (!webhookSecret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET is missing')
    return NextResponse.json({ error: 'Webhook unavailable' }, { status: 503 })
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type !== 'checkout.session.completed') {
    await recordProcessedEvent(event)
    return NextResponse.json({ received: true })
  }

  const session = event.data.object
  const supabase = createAdminClient()

  let lineItems: Stripe.ApiList<Stripe.LineItem>
  try {
    lineItems = await getStripe().checkout.sessions.listLineItems(session.id, {
      limit: 100,
      expand: ['data.price.product'],
    })
  } catch (error) {
    console.error('[stripe-webhook] line item lookup failed:', error)
    return NextResponse.json({ error: 'Line item lookup failed' }, { status: 502 })
  }

  const items = lineItems.data.map((lineItem) => {
    const product = lineItem.price?.product as Stripe.Product | undefined
    return {
      product_id: product?.metadata?.product_id ?? '',
      variant_id: product?.metadata?.variant_id || null,
      title: lineItem.description ?? 'Artikel',
      quantity: lineItem.quantity ?? 0,
      unit_amount: lineItem.price?.unit_amount ?? 0,
    }
  })

  const invalidItem = items.find(
    (item) =>
      !item.product_id ||
      !Number.isInteger(item.quantity) ||
      item.quantity <= 0 ||
      !Number.isInteger(item.unit_amount) ||
      item.unit_amount < 0,
  )
  if (items.length === 0 || invalidItem) {
    console.error('[stripe-webhook] invalid Stripe line item payload', {
      sessionId: session.id,
      invalidProductId: invalidItem?.product_id || null,
    })
    return NextResponse.json({ error: 'Invalid line items' }, { status: 500 })
  }

  const email = session.customer_details?.email ?? session.customer_email ?? ''
  const shippingDetails = session.collected_information?.shipping_details
  const shipping = shippingDetails
    ? {
        name: shippingDetails.name ?? null,
        address: shippingDetails.address
          ? {
              city: shippingDetails.address.city,
              country: shippingDetails.address.country,
              line1: shippingDetails.address.line1,
              line2: shippingDetails.address.line2,
              postal_code: shippingDetails.address.postal_code,
              state: shippingDetails.address.state,
            }
          : null,
        phone: session.customer_details?.phone ?? null,
      }
    : null

  // The UNIQUE constraint on stripe_session_id decides which parallel delivery
  // wins. Nothing is marked processed before this durable write succeeds.
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      stripe_session_id: session.id,
      stripe_payment_intent:
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id ?? null,
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

  if (orderError?.code === '23505') {
    await recordProcessedEvent(event)
    return NextResponse.json({ received: true, duplicate: true })
  }
  if (orderError || !order) {
    console.error('[stripe-webhook] order insert failed:', orderError)
    return NextResponse.json({ error: 'Order insert failed' }, { status: 500 })
  }

  await recordProcessedEvent(event)

  // Cart deletion is scoped to the immutable session metadata. Stock was
  // already reserved atomically when the cart item was created.
  const cartId = session.metadata?.cart_id
  if (cartId) {
    const { error: cartError } = await supabase.from('cart_items').delete().eq('cart_id', cartId)
    if (cartError) console.error('[stripe-webhook] paid cart cleanup failed:', cartError)
  }

  // Email sender catches/logs provider errors. CJ failures are persisted by
  // submitOrderToCj and retried by the fulfillment-retry cron.
  const [, fulfillment] = await Promise.all([
    sendOrderConfirmation(order.id),
    submitOrderToCj(order.id),
  ])
  if (!fulfillment.ok) {
    console.error('[stripe-webhook] CJ order forwarding failed:', fulfillment.error)
  }

  return NextResponse.json({ received: true })
}
