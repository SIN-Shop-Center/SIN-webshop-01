// Purpose: Service-role Supabase client (Step 3 of migration)
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)
//
// SECURITY: This client bypasses RLS. Only import from server-side code
// (Server Actions, route handlers). The 'server-only' import enforces this
// at build time — accidentally importing from a Client Component throws.

import 'server-only'

import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false }, db: { schema: 'shop' } },
  )
}
