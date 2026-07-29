// Purpose: Minimal session-state endpoint. Never exposes account identifiers.

import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    return NextResponse.json(
      { loggedIn: Boolean(user) },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch {
    return NextResponse.json(
      { loggedIn: false },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  }
}
