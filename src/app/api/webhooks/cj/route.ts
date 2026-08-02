// Purpose: Size-limited, signed and atomically replay-safe CJ status webhook.

import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

import { NextResponse } from 'next/server'

import { sendOrderDelivered, sendOrderShipped } from '@/lib/emails/send'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_BODY_BYTES = 256 * 1024
const EVENT_STATUS_MAP: Record<string, 'shipped' | 'delivered' | 'failed'> = {
  'order.shipped': 'shipped',
  'order.delivered': 'delivered',
  'order.exception': 'failed',
  'tracking.updated': 'shipped',
}

function trackingUrl(trackingNumber: string): string {
  return `https://t.17track.net/de#nums=${encodeURIComponent(trackingNumber)}`
}

function validSignature(raw: string, received: string, secret: string): boolean {
  const normalized = received.trim().replace(/^sha256=/i, '').toLowerCase()
  if (!/^[0-9a-f]{64}$/.test(normalized)) return false
  const expected = createHmac('sha256', secret).update(raw).digest('hex')
  const receivedBuffer = Buffer.from(normalized, 'hex')
  const expectedBuffer = Buffer.from(expected, 'hex')
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer)
}

export async function POST(req: Request) {
  const secret = String(process.env.CJ_WEBHOOK_SECRET || '').trim()
  if (secret.length < 16) {
    console.error('[cj-webhook] CJ_WEBHOOK_SECRET is missing or too short')
    return NextResponse.json({ error: 'Webhook unavailable' }, { status: 503 })
  }

  const contentLength = Number(req.headers.get('content-length') || 0)
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  }

  const raw = await req.text()
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  }

  const signature = req.headers.get('x-cj-signature') ?? ''
  if (!signature || !validSignature(raw, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let body: {
    event?: unknown
    orderId?: unknown
    trackingNumber?: unknown
    trackingNumberList?: unknown
  }
  try {
    body = JSON.parse(raw) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const event = typeof body.event === 'string' ? body.event.trim().slice(0, 100) : ''
  const cjOrderId = typeof body.orderId === 'string' ? body.orderId.trim().slice(0, 200) : ''
  if (!event || !cjOrderId) {
    return NextResponse.json({ error: 'Missing event or orderId' }, { status: 400 })
  }

  const fulfillmentStatus = EVENT_STATUS_MAP[event]
  if (!fulfillmentStatus) {
    return NextResponse.json({ received: true, ignored: true })
  }

  const listTracking = Array.isArray(body.trackingNumberList)
    ? body.trackingNumberList.find((value): value is string => typeof value === 'string')
    : undefined
  const trackingNumber = (
    typeof body.trackingNumber === 'string' ? body.trackingNumber : listTracking ?? ''
  ).trim().slice(0, 200)

  if (fulfillmentStatus === 'shipped' && !trackingNumber) {
    return NextResponse.json({ error: 'Tracking number required for shipped event' }, { status: 400 })
  }

  const eventId = createHash('sha256')
    .update(`${event}\n${cjOrderId}\n${trackingNumber}`)
    .digest('hex')

  const admin = createAdminClient()
  const { data: orders, error } = await admin.rpc('apply_cj_order_event', {
    p_event_id: eventId,
    p_event_type: event,
    p_cj_order_id: cjOrderId,
    p_fulfillment_status: fulfillmentStatus,
    p_tracking_number: trackingNumber,
  })

  if (error) {
    console.error('[cj-webhook] atomic order update failed:', error.message)
    // A non-2xx response keeps an event for an order that has not yet been
    // persisted retryable at the provider.
    return NextResponse.json({ error: 'Order update failed' }, { status: 503 })
  }

  if (!Array.isArray(orders) || orders.length === 0) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  for (const order of orders) {
    if (fulfillmentStatus === 'shipped' && order.tracking_number) {
      await sendOrderShipped(order.order_id, trackingUrl(order.tracking_number))
    } else if (fulfillmentStatus === 'delivered') {
      await sendOrderDelivered(order.order_id)
    }
  }

  return NextResponse.json({
    received: true,
    event,
    ordersUpdated: orders.length,
  })
}
