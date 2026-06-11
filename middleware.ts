// Purpose: Root middleware — Supabase session refresh (Issue #40/#41 glue)
// Docs: https://nextjs.org/docs/app/api-reference/file-conventions/middleware
//
// Ohne i18n (siehe Issue #48 für kombinierte Variante) — kann später zu
// `proxy.ts` umbenannt + mit createIntlMiddleware kombiniert werden.
//
// Wichtig: Webhooks (/api/*) und Static-Files werden bewusst ausgeschlossen,
// damit Crons nicht durch Auth-Refresh gebremst werden.

import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /api/* (Webhooks, Crons, Stripe — eigenes Auth-Modell)
     * - /_next/static, /_next/image (statische Assets)
     * - /icon*, /manifest*, /robots.txt, /sitemap.xml
     * - /opengraph-image
     * - Datei-Extensions (Bilder, Fonts, etc.)
     */
    '/((?!api|_next/static|_next/image|icon|manifest|robots\\.txt|sitemap\\.xml|opengraph-image|.*\\..*).*)',
  ],
}
