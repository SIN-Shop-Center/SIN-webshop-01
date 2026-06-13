// Purpose: CJ Dropshipping webhook handler for order status updates
// Docs: app/api/webhooks/cj/route.doc.md
//
// Events handled:
//   - order.shipped     → fulfillment_status='shipped', tracking_number, shipped_at
//   - order.delivered   → fulfillment_status='delivered', delivered_at
//   - order.exception   → fulfillment_status='failed'
//   - tracking.updated  → fulfillment_status='shipped', tracking_number
//
// Security:
//   - HMAC-SHA256 signature verification via X-CJ-Signature header
//   - Event deduplication via shop.processed_events
//   - Returns 200 only after successful processing

import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendOrderShipped, sendOrderDelivered } from '@/lib/emails/send'

const EVENT_STATUS_MAP: Record<string, string> = {
  'order.shipped': 'shipped',
  'order.delivered': 'delivered',
  'order.exception': 'failed',
  'tracking.updated': 'shipped',
}

// Generic tracking URL — works for most carriers via 17track
function trackingUrl(trackingNumber: string): string {
  return `https://t.17track.net/en#nums=${encodeURIComponent(trackingNumber)}`
}

export async function POST(req: Request) {
  const raw = await req.text()
  const sig = req.headers.get('x-cj-signature') ?? req.headers.get('X-CJ-Signature') ?? ''

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const secret = process.env.CJ_WEBHOOK_SECRET
  if (!secret) {
    console.error('[cj-webhook] CJ_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }

  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex')
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let body: {
    event?: string
    orderId?: string
    trackingNumber?: string
    trackingNumberList?: string[]
  }
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { event, orderId } = body
  if (!event || !orderId) {
    return NextResponse.json({ error: 'Missing event or orderId' }, { status: 400 })
  }

  const fulfillmentStatus = EVENT_STATUS_MAP[event]
  if (!fulfillmentStatus) {
    return NextResponse.json({ received: true, ignored: true, event })
  }

  // CJ sometimes sends a list of tracking numbers; use the first one.
  const trackingNumber =
    body.trackingNumber ??
    (Array.isArray(body.trackingNumberList) && body.trackingNumberList.length > 0
      ? body.trackingNumberList[0]
      : undefined)

  const supabase = createAdminClient()
  const eventKey = `cj:${event}:${orderId}:${trackingNumber ?? ''}`

  // Idempotency: ignore duplicate events
  const { error: dupError } = await supabase
    .from('processed_events')
    .insert({ event_id: eventKey, type: event })
  if (dupError?.code === '23505') {
    return NextResponse.json({ received: true, duplicate: true })
  }
  if (dupError) {
    console.error('[cj-webhook] processed_events insert failed:', dupError)
  }

  const update: Record<string, unknown> = {
    fulfillment_status: fulfillmentStatus,
    cj_order_status: event,
    updated_at: new Date().toISOString(),
  }
  if (trackingNumber) {
    update.tracking_number = trackingNumber
  }
  if (fulfillmentStatus === 'shipped') {
    update.shipped_at = new Date().toISOString()
  }
  if (fulfillmentStatus === 'delivered') {
    update.delivered_at = new Date().toISOString()
  }

  const { data: orders, error: updateError } = await supabase
    .from('orders')
    .update(update)
    .eq('cj_order_id', orderId)
    .select('id, email, tracking_number')

  if (updateError) {
    console.error('[cj-webhook] Order update failed:', updateError)
    return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
  }

  if (orders && orders.length > 0) {
    for (const order of orders) {
      if (fulfillmentStatus === 'shipped' && order.tracking_number) {
        sendOrderShipped(order.id, trackingUrl(order.tracking_number)).catch((e) =>
          console.error('[cj-webhook] Shipped email failed:', e),
        )
      } else if (fulfillmentStatus === 'delivered') {
        sendOrderDelivered(order.id).catch((e) =>
          console.error('[cj-webhook] Delivered email failed:', e),
        )
      }
    }
  } else {
    console.warn('[cj-webhook] No order found for cj_order_id:', orderId)
  }

  return NextResponse.json({
    received: true,
    event,
    ordersUpdated: orders?.length ?? 0,
  })
}

// Cloudflare Pages/Workers may send OPTIONS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
