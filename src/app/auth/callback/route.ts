// Purpose: OAuth callback with same-origin redirect enforcement.

import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

function appOrigin(): string {
  const url = new URL(String(process.env.NEXT_PUBLIC_APP_URL || '').trim())
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    throw new Error('NEXT_PUBLIC_APP_URL must use HTTPS')
  }
  return url.origin
}

function safeNextPath(raw: string | null): string {
  const value = String(raw || '/').trim()
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return '/'
  }
  try {
    const parsed = new URL(value, 'https://local.invalid')
    if (parsed.origin !== 'https://local.invalid') return '/'
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return '/'
  }
}

export async function GET(request: Request) {
  let origin: string
  try {
    origin = appOrigin()
  } catch (error) {
    console.error('[auth-callback] invalid app URL:', error)
    return NextResponse.json({ error: 'Authentication unavailable' }, { status: 503 })
  }

  const searchParams = new URL(request.url).searchParams
  const code = searchParams.get('code')
  const nextPath = safeNextPath(searchParams.get('next'))

  if (code && code.length <= 2048) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(nextPath, origin))
    console.error('[auth-callback] code exchange failed:', error.message)
  }

  return NextResponse.redirect(new URL('/auth/error', origin))
}
