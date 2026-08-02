import { createHash } from 'node:crypto'

import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'

const TOKEN_MAX_AGE_MS = 72 * 60 * 60 * 1000

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function redirectTarget(status: 'confirmed' | 'invalid'): URL {
  const base = new URL(String(process.env.NEXT_PUBLIC_APP_URL || '').trim())
  base.pathname = '/newsletter-bestaetigt'
  base.search = `status=${status}`
  base.hash = ''
  return base
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') ?? ''
  if (token.length < 20 || token.length > 256) {
    return NextResponse.redirect(redirectTarget('invalid'))
  }

  const admin = createAdminClient()
  const cutoff = new Date(Date.now() - TOKEN_MAX_AGE_MS).toISOString()
  const { data: subscriber, error: readError } = await admin
    .from('newsletter_subscribers')
    .select('id')
    .eq('confirmation_token_hash', tokenHash(token))
    .eq('status', 'pending')
    .gte('confirmation_sent_at', cutoff)
    .maybeSingle()

  if (readError || !subscriber) {
    if (readError) console.error('[newsletter-confirm] lookup failed:', readError.message)
    return NextResponse.redirect(redirectTarget('invalid'))
  }

  const now = new Date().toISOString()
  const { error: updateError } = await admin
    .from('newsletter_subscribers')
    .update({
      status: 'confirmed',
      confirmation_token_hash: null,
      confirmed_at: now,
      unsubscribed_at: null,
      updated_at: now,
    })
    .eq('id', subscriber.id)
    .eq('status', 'pending')

  if (updateError) {
    console.error('[newsletter-confirm] update failed:', updateError.message)
    return NextResponse.redirect(redirectTarget('invalid'))
  }

  return NextResponse.redirect(redirectTarget('confirmed'))
}
