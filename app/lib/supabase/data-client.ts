// Purpose: Data-only Supabase client for public reads (no cookie/auth handling)
// Docs: PLAN-VERKAUFSFAEHIG.md
//
// Uses @supabase/supabase-js directly, NOT @supabase/ssr.
// The SSR client requires next/headers cookies which fail in CF Workers.
// For public product queries, we only need anon-key + schema header.

import { createClient } from '@supabase/supabase-js'

export function createDataClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createClient(url, anonKey, {
    db: { schema: 'shop' },
    global: {
      headers: { 'Accept-Profile': 'shop' },
    },
  })
}
