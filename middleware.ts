import {type NextRequest, NextResponse} from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import {updateSession} from '@/lib/supabase/middleware'
import {routing} from '@/i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

export async function middleware(request: NextRequest) {
  const intlResponse = intlMiddleware(request)
  const sessionResponse = await updateSession(request)

  intlResponse.cookies.getAll().forEach((c) => sessionResponse.cookies.set(c.name, c.value))
  sessionResponse.cookies.getAll().forEach((c) => intlResponse.cookies.set(c.name, c.value, c as any))

  return intlResponse
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|icon|manifest|robots\\.txt|sitemap\\.xml|opengraph-image|.*\\..*).*)',
  ],
}
