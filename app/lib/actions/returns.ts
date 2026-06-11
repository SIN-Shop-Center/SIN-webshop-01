'use server'

// Purpose: Return / RMA Server Actions (Issue #45 — full flow)
// Docs: BGB § 312g, § 355 — 14-Tage-Widerrufsrecht
//
// Customer erstellt ReturnRequest → Admin approved → Stripe-Refund.
// Idempotente Refund-API-Calls via Stripe idempotency_key.

import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const FOURTEEN_DAYS_MS = 14 * 24 * 3600 * 1000

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht eingeloggt')
  const { data: isAdmin } = await supabase.rpc('is_admin')
  if (!isAdmin) throw new Error('Keine Berechtigung')
  return user
}

export async function createReturnRequest(orderId: string, reason: string) {
  if (!reason || reason.trim().length < 5) {
    throw new Error('Bitte gib einen Widerrufsgrund an (mind. 5 Zeichen).')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht eingeloggt')

  const admin = createAdminClient()
  const { data: order, error } = await admin
    .from('orders')
    .select('id, created_at, user_id')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) throw error
  if (!order) throw new Error('Bestellung nicht gefunden')

  const ageMs = Date.now() - new Date(order.created_at).getTime()
  if (ageMs > FOURTEEN_DAYS_MS) {
    throw new Error('Widerrufsfrist (14 Tage) ist abgelaufen.')
  }

  // Schon ein offener Return?
  const { data: existing } = await admin
    .from('return_requests')
    .select('id, status')
    .eq('order_id', orderId)
    .eq('user_id', user.id)
    .in('status', ['pending', 'approved'])
    .maybeSingle()

  if (existing) {
    throw new Error(`Es existiert bereits ein Return (Status: ${existing.status}).`)
  }

  const { error: insertError } = await admin.from('return_requests').insert({
    order_id: orderId,
    user_id: user.id,
    reason: reason.trim(),
  })
  if (insertError) throw insertError
}

export async function approveAndRefund(returnId: string) {
  await requireAdmin()

  const admin = createAdminClient()

  const { data: ret, error } = await admin
    .from('return_requests')
    .select(
      'id, status, refund_amount_cents, order_id, orders!inner(stripe_payment_intent, amount_total)',
    )
    .eq('id', returnId)
    .eq('status', 'pending')
    .maybeSingle()

  if (error) throw error
  if (!ret) throw new Error('Return nicht gefunden oder bereits bearbeitet.')

  type JoinedOrder = {
    stripe_payment_intent: string | null
    amount_total: number
  }
  const order = (Array.isArray(ret.orders) ? ret.orders[0] : ret.orders) as
    | JoinedOrder
    | undefined
  if (!order?.stripe_payment_intent) {
    throw new Error('Kein Stripe-Payment-Intent für diese Bestellung.')
  }

  const amount = ret.refund_amount_cents ?? order.amount_total

  const refund = await stripe.refunds.create(
    {
      payment_intent: order.stripe_payment_intent,
      amount,
      reason: 'requested_by_customer',
    },
    { idempotencyKey: `refund-${returnId}` },
  )

  const { error: updateError } = await admin
    .from('return_requests')
    .update({
      status: 'refunded',
      stripe_refund_id: refund.id,
      approved_at: new Date().toISOString(),
      refunded_at: new Date().toISOString(),
    })
    .eq('id', returnId)

  if (updateError) throw updateError

  return { refundId: refund.id, amount }
}

export async function rejectReturn(returnId: string) {
  await requireAdmin()
  const admin = createAdminClient()
  const { error } = await admin
    .from('return_requests')
    .update({ status: 'rejected' })
    .eq('id', returnId)
    .eq('status', 'pending')
  if (error) throw error
}
