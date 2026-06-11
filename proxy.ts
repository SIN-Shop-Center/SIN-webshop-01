// Purpose: Next.js 16 proxy (middleware replacement) for Supabase session refresh
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)

import { updateSession } from '@/lib/supabase/proxy'
import { type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Alle Pfade außer statischen Assets:
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
