// Purpose: Server-side Supabase client (Step 2 of migration)
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Wichtig: Diesen Client NICHT in einer globalen Variable halten.
 * Immer pro Request/Funktion neu erstellen.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // setAll aus einer Server Component aufgerufen.
            // Kann ignoriert werden, da der Proxy die Session refresht.
          }
        },
      },
    },
  )
}
