import { NextRequest, NextResponse } from 'next/server'
import { createRouteSupabaseClient } from '@/lib/supabase-server'

function normalizeNextPath(candidate: string | null): string {
  if (!candidate || !candidate.startsWith('/')) {
    return '/kundencenter'
  }
  if (candidate.startsWith('//') || candidate.startsWith('/login') || candidate.startsWith('/kundencenter/login')) {
    return '/kundencenter'
  }
  return candidate
}

export async function GET(request: NextRequest) {
  const requestURL = new URL(request.url)
  const code = requestURL.searchParams.get('code')
  const nextPath = normalizeNextPath(requestURL.searchParams.get('next'))

  if (code) {
    try {
      const supabase = createRouteSupabaseClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        const loginURL = new URL('/login', requestURL.origin)
        loginURL.searchParams.set('error', 'auth_callback_failed')
        loginURL.searchParams.set('next', nextPath)
        return NextResponse.redirect(loginURL)
      }
    } catch {
      const loginURL = new URL('/login', requestURL.origin)
      loginURL.searchParams.set('error', 'auth_callback_failed')
      loginURL.searchParams.set('next', nextPath)
      return NextResponse.redirect(loginURL)
    }
  }

  const redirectURL = new URL(nextPath, requestURL.origin)
  return NextResponse.redirect(redirectURL)
}
