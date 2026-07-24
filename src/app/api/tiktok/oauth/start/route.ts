// Purpose: Authenticated TikTok Shop OAuth start with CSRF state binding.
// Docs: docs/TIKTOK_SHOP_API_INTEGRATION.md

import { randomBytes } from 'node:crypto'

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/admin-guard'

const STATE_COOKIE = 'shopsin_tiktok_oauth_state'
const DEFAULT_AUTHORIZE_URL = 'https://services.tiktokshop.com/open/authorize'

export async function GET() {
  await requireAdmin()

  const serviceId = String(process.env.TIKTOK_SERVICE_ID || '').trim()
  if (!serviceId) {
    return NextResponse.json(
      { error: 'TIKTOK_SERVICE_ID ist nicht konfiguriert.' },
      { status: 503 },
    )
  }

  const state = randomBytes(32).toString('base64url')
  const cookieStore = await cookies()
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/api/tiktok/oauth',
    maxAge: 10 * 60,
  })

  const authorizeURL = new URL(
    String(process.env.TIKTOK_AUTHORIZATION_URL || DEFAULT_AUTHORIZE_URL).trim(),
  )
  authorizeURL.searchParams.set('service_id', serviceId)
  authorizeURL.searchParams.set('state', state)

  return NextResponse.redirect(authorizeURL)
}
