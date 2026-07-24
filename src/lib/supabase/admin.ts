// Purpose: Service-role Supabase client (Step 3 of migration)
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)
//
// SECURITY: This client bypasses RLS. Only import from server-side code
// (Server Actions, route handlers). The 'server-only' import enforces this
// at build time — accidentally importing from a Client Component throws.

import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { asLooseSupabaseClient, type LooseSupabaseClient } from './loose-client'

function createServiceRoleClient(schema: 'shop' | 'public'): LooseSupabaseClient {
  return asLooseSupabaseClient(createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false }, db: { schema } } as any,
  ))
}

export function createAdminClient() {
  return createServiceRoleClient('shop')
}

/**
 * Control-plane tables (queues, trends, UGC, channels) currently live in the
 * public schema while the storefront domain lives in shop. Keep this split
 * explicit until the schema consolidation migration is complete.
 */
export function createPublicAdminClient() {
  return createServiceRoleClient('public')
}
