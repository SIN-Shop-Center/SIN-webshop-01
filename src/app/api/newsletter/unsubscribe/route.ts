// Purpose: Token-hashed one-click unsubscribe (DSGVO + RFC 8058).

import { createHash } from 'node:crypto'

import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

async function applyUnsubscribe(req: Request): Promise<boolean> {
  const token = new URL(req.url).searchParams.get('token') ?? ''
  if (token.length < 20 || token.length > 256) return false

  const admin = createAdminClient()
  const now = new Date().toISOString()
  const { error } = await admin
    .from('newsletter_subscribers')
    .update({
      status: 'unsubscribed',
      confirmation_token_hash: null,
      unsubscribed_at: now,
      updated_at: now,
    })
    .eq('unsubscribe_token_hash', tokenHash(token))

  if (error) {
    console.error('[newsletter-unsubscribe] update failed:', error.message)
    return false
  }
  return true
}

function confirmationPage(): URL {
  const base = new URL(String(process.env.NEXT_PUBLIC_APP_URL || '').trim())
  base.pathname = '/newsletter-abgemeldet'
  base.search = ''
  base.hash = ''
  return base
}

export async function GET(req: Request) {
  await applyUnsubscribe(req)
  // Always show the same result to avoid exposing whether a token existed.
  return NextResponse.redirect(confirmationPage())
}

// RFC 8058 clients expect a successful non-interactive response.
export async function POST(req: Request) {
  await applyUnsubscribe(req)
  return new NextResponse(null, { status: 204 })
}
