// Purpose: Submit a paid shop order to CJ with retry-safe status tracking
// Docs: AGENTS.md — used by Stripe webhook AND retry cron
//
// This extracts the CJ-forwarding logic from the Stripe webhook into a
// reusable module so both the webhook and the fulfillment-retry cron can
// call it with consistent error handling.

import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { createCjOrder } from '@/lib/cj/orders'
import type Stripe from 'stripe'

const MAX_ATTEMPTS = 5

type OrderToFulfill = {
  id: string
  email: string | null
  items: { product_id: string; title: string; quantity: number }[]
  shipping_address: {
    name: string | null
    address: Stripe.Address | null
    phone: string | null
  } | null
  fulfillment_status: string
  fulfillment_attempts: number
}

export async function submitOrderToCj(orderId: string): Promise<{
  ok: boolean
  error?: string
}> {
  const supabase = createAdminClient()

  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, email, items, shipping_address, fulfillment_status, fulfillment_attempts')
    .eq('id', orderId)
    .single<OrderToFulfill>()

  if (fetchError || !order) {
    return { ok: false, error: `Order not found: ${orderId}` }
  }

  if (order.fulfillment_status === 'forwarded' || order.fulfillment_status === 'shipped') {
    return { ok: true }
  }

  if (order.fulfillment_attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: 'Max attempts reached — manual review needed' }
  }

  if (!order.shipping_address?.address) {
    await markFailed(supabase, order.id, order.fulfillment_attempts, 'No shipping address')
    return { ok: false, error: 'No shipping address' }
  }

  const parseName = (full: string | null): { first: string; last: string } => {
    if (!full) return { first: '', last: '' }
    const parts = full.trim().split(/\s+/)
    return { first: parts[0] ?? '', last: parts.slice(1).join(' ') }
  }

  const productIds = order.items.map((i) => i.product_id).filter(Boolean)
  const { data: products } = await supabase
    .from('products')
    .select('id, cj_variant_id')
    .in('id', productIds)

  const cjProducts = order.items
    .map((item) => {
      const match = products?.find((p) => p.id === item.product_id)
      return match?.cj_variant_id
        ? { vid: match.cj_variant_id, quantity: item.quantity }
        : null
    })
    .filter((x): x is { vid: string; quantity: number } => x !== null)

  if (cjProducts.length === 0) {
    await markFailed(supabase, order.id, order.fulfillment_attempts, 'No CJ variants found')
    return { ok: false, error: 'No CJ variants found for order items' }
  }

  const addr = order.shipping_address.address
  const name = parseName(order.shipping_address.name)

  try {
    const { cjOrderId } = await createCjOrder({
      orderNumber: order.id,
      shipping: {
        name: order.shipping_address.name ?? 'Kunde',
        phone: order.shipping_address.phone ?? '0000000000',
        email: order.email ?? '',
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
        fulfillment_status: 'forwarded',
        fulfillment_error: null,
      })
      .eq('id', order.id)

    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown CJ error'
    await markFailed(supabase, order.id, order.fulfillment_attempts, message)
    return { ok: false, error: message }
  }
}

async function markFailed(
  supabase: ReturnType<typeof createAdminClient>,
  orderId: string,
  attempts: number,
  message: string,
) {
  console.error(`[fulfillment] Order ${orderId} failed: ${message}`)
  const newAttempts = attempts + 1

  await supabase
    .from('orders')
    .update({
      fulfillment_status: 'failed',
      fulfillment_error: message.slice(0, 500),
      fulfillment_attempts: newAttempts,
    })
    .eq('id', orderId)

  if (newAttempts >= 5) {
    await sendFulfillmentAlert(orderId, message)
  }
}

async function sendFulfillmentAlert(orderId: string, message: string) {
  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.ADMIN_ALERT_EMAIL
  if (!apiKey || !to) return

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'SIN Shop <alerts@shopsin.delqhi.com>',
        to,
        subject: `Fulfillment fehlgeschlagen: Bestellung ${orderId.slice(0, 8)}`,
        text: `Die Bestellung ${orderId} konnte nach 5 Versuchen nicht bei CJ eingereicht werden.\n\nFehler: ${message}\n\nAdmin-Panel: https://shopsin.delqhi.com/admin/fulfillment`,
      }),
    })
  } catch (e) {
    console.error('[fulfillment] Alert-Mail fehlgeschlagen:', e)
  }
}
