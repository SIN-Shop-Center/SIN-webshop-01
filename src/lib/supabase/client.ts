// Purpose: Browser-side Supabase client (Step 2 of migration)
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.generated'

export function createClient() {
  return createBrowserClient<Database, 'shop'>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: 'shop' },
    },
  )
}
