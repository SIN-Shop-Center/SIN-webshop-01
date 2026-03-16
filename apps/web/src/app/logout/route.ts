import { NextRequest, NextResponse } from 'next/server'
import { createRouteSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteSupabaseClient()
    await supabase.auth.signOut()
  } catch {
    // Logout should still continue with redirect.
  }

  const url = new URL('/login', request.url)
  url.searchParams.set('message', 'logged_out')
  return NextResponse.redirect(url)
}

