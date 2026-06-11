// Purpose: TikTok Shop Webhook-Receiver — Order-Events sofort statt per Polling
// Docs: docs/SIN_TIKTOK_MASTER_PIPELINE.md (Stufe 5)
//
// Setup im Partner Center: Webhook-URL auf
// https://DEINE-DOMAIN/api/tiktok/webhook setzen, Event "ORDER_STATUS_CHANGE".
// Der 30-min-Cron (tiktok-orders) bleibt als Fallback bestehen.

import { createHmac, timingSafeEqual } from 'node:crypto'

import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'

const APP_KEY = process.env.TIKTOK_APP_KEY ?? ''
const APP_SECRET = process.env.TIKTOK_APP_SECRET ?? ''

function verifySignature(rawBody: string, signature: string | null): boolean {
  // Ohne konfiguriertes Secret IMMER ablehnen — sonst würde mit '' gehasht
  // und ein Angreifer könnte gültige Signaturen fälschen.
  if (!APP_SECRET || !APP_KEY || !signature) return false
  const expected = createHmac('sha256', APP_SECRET)
    .update(`${APP_KEY}${rawBody}`)
    .digest('hex')
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text()

  if (!verifySignature(rawBody, request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: {
    type: number
    shop_id: string
    timestamp: number
    data: { order_id: string; order_status: string }
  }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Nur als "received" vormerken — die eigentliche CJ-Weiterleitung macht
  // der tiktok-orders Cron (idempotent über die tiktok_orders Tabelle).
  if (event.data?.order_id && event.data.order_status === 'AWAITING_SHIPMENT') {
    const supabase = createAdminClient()
    await supabase.from('tiktok_orders').upsert(
      {
        tiktok_order_id: event.data.order_id,
        status: 'received',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tiktok_order_id', ignoreDuplicates: true },
    )
  }

  return NextResponse.json({ ok: true })
}
