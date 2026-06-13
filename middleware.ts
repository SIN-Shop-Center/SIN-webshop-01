import {type NextRequest, NextResponse} from 'next/server'
import {updateSession} from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|icon|manifest|robots\\.txt|sitemap\\.xml|opengraph-image|.*\\..*).*)',
  ],
}