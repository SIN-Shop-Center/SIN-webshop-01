// Purpose: Session endpoint for header account menu
// Docs: AGENTS.md

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ loggedIn: false })
    }
    return NextResponse.json({ loggedIn: true, email: user.email })
  } catch {
    return NextResponse.json({ loggedIn: false })
  }
}
