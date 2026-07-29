'use server'

// Purpose: Return / RMA Server Actions (Issue #45 — full flow)
// Docs: BGB § 312g, § 355 — 14-Tage-Widerrufsrecht
//
// Customer erstellt ReturnRequest → Admin approved → Stripe-Refund.
// Idempotente Refund-API-Calls via Stripe idempotency_key.

import { requireAdmin } from '@/lib/admin-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'

const FOURTEEN_DAYS_MS = 14 * 24 * 3600 * 1000
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function createReturnRequest(orderId: string, reason: string) {
  if (!UUID_RE.test(orderId)) throw new Error('Ungültige Bestell-ID')
  const normalizedReason = reason.trim().slice(0, 1000)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht eingeloggt')

  const admin = createAdminClient()
  const { data: order, error } = await admin
    .from('orders')
    .select('id, created_at, delivered_at, user_id, status, fulfillment_status')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) throw error
  if (!order) throw new Error('Bestellung nicht gefunden')

  if (['refunded', 'cancelled'].includes(order.status)) {
    throw new Error('Diese Bestellung wurde bereits storniert oder erstattet.')
  }

  // Bei Waren beginnt die 14-Tage-Frist grundsätzlich mit dem Erhalt. Vor der
  // Zustellung darf ein Kunde die Anfrage ebenfalls bereits einreichen.
  if (order.delivered_at) {
    const ageMs = Date.now() - new Date(order.delivered_at).getTime()
    if (!Number.isFinite(ageMs) || ageMs > FOURTEEN_DAYS_MS) {
      throw new Error('Die reguläre Widerrufsfrist ist abgelaufen. Bitte kontaktiere den Support.')
    }
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
    reason: normalizedReason || 'Widerruf ohne Angabe von Gründen',
  })
  if (insertError?.code === '23505') {
    throw new Error('Für diese Bestellung existiert bereits eine offene Rücksendeanfrage.')
  }
  if (insertError) throw insertError
}

export async function approveAndRefund(returnId: string) {
  if (!UUID_RE.test(returnId)) throw new Error('Ungültige Return-ID')
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

  const amount = Number(ret.refund_amount_cents ?? order.amount_total)
  if (!Number.isInteger(amount) || amount <= 0 || amount > Number(order.amount_total)) {
    throw new Error('Ungültiger Erstattungsbetrag. Manuelle Prüfung erforderlich.')
  }

  const refund = await getStripe().refunds.create(
    {
      payment_intent: order.stripe_payment_intent,
      amount,
      reason: 'requested_by_customer',
    },
    { idempotencyKey: `refund-${returnId}` },
  )

  const now = new Date().toISOString()

  // Update the order first. If the following return-row update fails, the
  // request remains pending and the same Stripe idempotency key repairs the
  // state on retry without creating a second refund.
  const { error: orderUpdateError } = await admin
    .from('orders')
    .update({
      status: amount === Number(order.amount_total) ? 'refunded' : 'partially_refunded',
      updated_at: now,
    })
    .eq('id', ret.order_id)
  if (orderUpdateError) throw orderUpdateError

  const { error: updateError } = await admin
    .from('return_requests')
    .update({
      status: 'refunded',
      stripe_refund_id: refund.id,
      approved_at: now,
      refunded_at: now,
    })
    .eq('id', returnId)
    .eq('status', 'pending')

  if (updateError) throw updateError

  return { refundId: refund.id, amount }
}

export async function rejectReturn(returnId: string) {
  if (!UUID_RE.test(returnId)) throw new Error('Ungültige Return-ID')
  await requireAdmin()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('return_requests')
    .update({ status: 'rejected', rejected_at: new Date().toISOString() })
    .eq('id', returnId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Return nicht gefunden oder bereits bearbeitet.')
}
