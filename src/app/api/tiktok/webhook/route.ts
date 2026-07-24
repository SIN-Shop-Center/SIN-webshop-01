// Purpose: Signed, shop-bound and replay-safe TikTok Shop order webhook.
// TikTok Shop signs Authorization = HMAC-SHA256(app_key + raw_body, app_secret).

import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'

const MAX_BODY_BYTES = 256 * 1024

function verifySignature(
  rawBody: string,
  signature: string | null,
  appKey: string,
  appSecret: string,
): boolean {
  const normalized = String(signature || '').trim().toLowerCase()
  if (!/^[0-9a-f]{64}$/.test(normalized)) return false
  const expected = createHmac('sha256', appSecret)
    .update(`${appKey}${rawBody}`)
    .digest('hex')
  const expectedBuffer = Buffer.from(expected, 'hex')
  const receivedBuffer = Buffer.from(normalized, 'hex')
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer)
}

export async function POST(request: Request) {
  const appKey = String(process.env.TIKTOK_APP_KEY || '').trim()
  const appSecret = String(process.env.TIKTOK_APP_SECRET || '').trim()
  if (!appKey || appSecret.length < 16) {
    console.error('[tiktok-webhook] app credentials are missing or too short')
    return NextResponse.json({ error: 'Webhook unavailable' }, { status: 503 })
  }

  const contentLength = Number(request.headers.get('content-length') || 0)
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  }

  const rawBody = await request.text()
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  }

  if (!verifySignature(rawBody, request.headers.get('authorization'), appKey, appSecret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: {
    type?: unknown
    tts_notification_id?: unknown
    shop_id?: unknown
    timestamp?: unknown
    data?: { order_id?: unknown; order_status?: unknown }
  }
  try {
    event = JSON.parse(rawBody) as typeof event
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const shopId = typeof event.shop_id === 'string' ? event.shop_id.trim().slice(0, 200) : ''
  const orderId = typeof event.data?.order_id === 'string'
    ? event.data.order_id.trim().slice(0, 200)
    : ''
  const orderStatus = typeof event.data?.order_status === 'string'
    ? event.data.order_status.trim().slice(0, 60)
    : ''
  if (!shopId || !orderId || !orderStatus) {
    return NextResponse.json({ error: 'Invalid order notification' }, { status: 400 })
  }

  const notificationId = typeof event.tts_notification_id === 'string'
    ? event.tts_notification_id.trim().slice(0, 220)
    : createHash('sha256').update(rawBody).digest('hex')

  const admin = createAdminClient()
  const { data: applied, error } = await admin.rpc('apply_tiktok_order_notification', {
    p_notification_id: notificationId,
    p_shop_id: shopId,
    p_order_id: orderId,
    p_order_status: orderStatus,
  })

  if (error) {
    console.error('[tiktok-webhook] atomic notification apply failed:', error.message)
    return NextResponse.json({ error: 'Notification processing failed' }, { status: 503 })
  }

  return NextResponse.json({ ok: true, duplicate: applied !== true })
}
