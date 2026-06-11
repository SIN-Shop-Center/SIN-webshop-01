// Purpose: Stripe webhook — order insert + Resend confirmation (Step 4)
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)

import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendOrderConfirmation } from '@/lib/email'

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
      })

      const items = lineItems.data.map((li) => ({
        product_id: li.price?.metadata?.product_id ?? '',
        title: li.description ?? 'Artikel',
        quantity: li.quantity ?? 1,
        unit_amount: li.price?.unit_amount ?? 0,
      }))

      const email =
        session.customer_details?.email ?? session.customer_email ?? ''

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
        })
        .select('id')
        .single()

      if (!error && order && email) {
        try {
          await sendOrderConfirmation({
            to: email,
            orderId: order.id,
            items,
            totalCents: session.amount_total ?? 0,
          })
        } catch (e) {
          console.error('Order confirmation email failed:', e)
          // Bestellung ist gespeichert — E-Mail-Fehler nicht eskalieren
        }
      }
    }
  }

  return NextResponse.json({ received: true })
}
