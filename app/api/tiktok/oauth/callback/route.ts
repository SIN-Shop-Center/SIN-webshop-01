// Purpose: OAuth-Callback — TikTok liefert auth_code nach Seller-Autorisierung
// Docs: docs/TIKTOK_SHOP_API_INTEGRATION.md
//
// Setup im Partner Center: Redirect-URL auf
// https://DEINE-DOMAIN/api/tiktok/oauth/callback setzen.

import { NextResponse } from 'next/server'

import { exchangeAuthCode, getShopCipher } from '@/lib/tiktok/client'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code') ?? url.searchParams.get('auth_code')

  if (!code) {
    return NextResponse.json({ error: 'auth_code fehlt' }, { status: 400 })
  }

  try {
    await exchangeAuthCode(code)
    await getShopCipher()

    return NextResponse.redirect(
      new URL('/admin?tiktok=connected', process.env.NEXT_PUBLIC_APP_URL ?? url.origin),
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown'
    return NextResponse.json({ error: `TikTok-Autorisierung fehlgeschlagen: ${message}` }, {
      status: 500,
    })
  }
}
