// Purpose: TikTok Shop OAuth callback with single-use CSRF state validation.
// Docs: docs/TIKTOK_SHOP_API_INTEGRATION.md

import { timingSafeEqual } from 'node:crypto'

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { exchangeAuthCode, getShopCipher } from '@/lib/tiktok/client'

const STATE_COOKIE = 'shopsin_tiktok_oauth_state'

function statesMatch(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected)
  const actualBuffer = Buffer.from(actual)
  if (expectedBuffer.length !== actualBuffer.length) return false
  return timingSafeEqual(expectedBuffer, actualBuffer)
}

function adminRedirect(requestURL: URL, status: string) {
  const appURL = String(process.env.NEXT_PUBLIC_APP_URL || requestURL.origin).trim()
  return NextResponse.redirect(new URL(`/admin/tiktok?oauth=${status}`, appURL))
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code') ?? url.searchParams.get('auth_code')
  const state = url.searchParams.get('state') ?? ''
  const providerError = url.searchParams.get('error')
  const cookieStore = await cookies()
  const expectedState = cookieStore.get(STATE_COOKIE)?.value ?? ''

  // State is single-use even when the provider returns an error.
  cookieStore.delete(STATE_COOKIE)

  if (!expectedState || !state || !statesMatch(expectedState, state)) {
    console.error('[tiktok-oauth] rejected callback with invalid state')
    return NextResponse.json({ error: 'Ungueltiger OAuth-State.' }, { status: 400 })
  }

  if (providerError || !code || code === 'null') {
    console.warn('[tiktok-oauth] authorization denied or code missing', providerError || 'missing_code')
    return adminRedirect(url, 'denied')
  }

  try {
    await exchangeAuthCode(code)
    await getShopCipher()
    return adminRedirect(url, 'connected')
  } catch (error) {
    console.error('[tiktok-oauth] token exchange failed', error)
    return adminRedirect(url, 'failed')
  }
}
