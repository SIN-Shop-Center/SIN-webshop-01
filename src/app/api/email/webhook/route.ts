// Purpose: Signed, replay-safe Resend delivery webhook.

import { NextResponse } from 'next/server'
import { Webhook } from 'svix'

import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 256 * 1024

export async function POST(req: Request) {
  const secret = String(process.env.RESEND_WEBHOOK_SECRET || '').trim()
  if (!secret) {
    console.error('[email-webhook] RESEND_WEBHOOK_SECRET is missing')
    return NextResponse.json({ error: 'Webhook unavailable' }, { status: 503 })
  }

  const contentLength = Number(req.headers.get('content-length') || 0)
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  }

  const svixId = req.headers.get('svix-id') ?? ''
  const svixTimestamp = req.headers.get('svix-timestamp') ?? ''
  const svixSignature = req.headers.get('svix-signature') ?? ''
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing signature headers' }, { status: 400 })
  }

  const payload = await req.text()
  if (Buffer.byteLength(payload, 'utf8') > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  }

  let event: {
    type: string
    data?: { to?: string[]; bounce_type?: string }
  }
  try {
    event = new Webhook(secret).verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as typeof event
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const recipient = event.data?.to?.[0]?.trim().toLowerCase() ?? ''
  if (!recipient || recipient.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    return NextResponse.json({ ok: true, ignored: 'no valid recipient' })
  }

  const admin = createAdminClient()
  const { data: applied, error } = await admin.rpc('apply_email_delivery_event', {
    p_event_id: svixId,
    p_event_type: String(event.type || '').slice(0, 100),
    p_recipient: recipient,
  })

  if (error) {
    console.error('[email-webhook] atomic event apply failed:', error.message)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, duplicate: applied !== true })
}
