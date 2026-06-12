// Purpose: One-Click-Unsubscribe (DSGVO + RFC 8058) (Issue #15)

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function unsubscribe(req: Request) {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'missing token' }, { status: 400 })
  }
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('newsletter_subscribers')
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq('unsubscribe_token', token)
    .is('unsubscribed_at', null)

  if (error) {
    return NextResponse.json({ error: 'db error' }, { status: 500 })
  }
  return NextResponse.redirect(
    new URL(
      '/newsletter-abgemeldet',
      process.env.NEXT_PUBLIC_APP_URL ?? 'https://shopsin.delqhi.com',
    ),
  )
}

export async function GET(req: Request) {
  return unsubscribe(req)
}

// RFC 8058 One-Click (Mail-Clients senden POST)
export async function POST(req: Request) {
  return unsubscribe(req)
}
