// Purpose: Resend Event-Webhook (Issue #43 — Bounce/Complaint-Handling)
// Docs: https://resend.com/docs/webhooks — svix-signed events
//
// Events: email.bounced → email_verified=false (User muss neue Email bestätigen)
//         email.complained → marketing_consent=false (Newsletter abbestellt)

import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const payload = await req.text()
  const wh = new Webhook(process.env.RESEND_WEBHOOK_SECRET!)

  let event: {
    type: string
    data?: { to?: string[]; bounce_type?: string }
  }
  try {
    event = wh.verify(payload, {
      'svix-id': req.headers.get('svix-id') ?? '',
      'svix-timestamp': req.headers.get('svix-timestamp') ?? '',
      'svix-signature': req.headers.get('svix-signature') ?? '',
    }) as typeof event
  } catch {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 })
  }

  const recipient = event.data?.to?.[0]
  if (!recipient) return NextResponse.json({ ok: true, ignored: 'no recipient' })

  const admin = createAdminClient()

  if (event.type === 'email.bounced') {
    await admin
      .from('profiles')
      .update({ email_verified: false })
      .eq('email', recipient)
  } else if (event.type === 'email.complained') {
    await admin
      .from('profiles')
      .update({ marketing_consent: false })
      .eq('email', recipient)
  }

  return NextResponse.json({ ok: true })
}
