import { createServerClient } from '@supabase/ssr'
import type { Session } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { findSinA2AAgentByGuideHost, isSinA2AIndexHost } from '@/lib/sin-a2a/registry'

const ADMIN_ROLES = new Set(['admin', 'ops'])

function hasSupabaseAuthEnv(): boolean {
  return Boolean(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) &&
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY),
  )
}

function requiredSupabaseUrl() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  if (!value) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) is required.')
  }
  return value
}

function requiredSupabaseAnonKey() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!value) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY) is required.')
  }
  return value
}

function parseRoles(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim().toLowerCase() : ''))
      .filter((entry) => entry.length > 0)
  }
  if (typeof value === 'string') {
    const role = value.trim().toLowerCase()
    return role ? [role] : []
  }
  return []
}

function sessionRoles(session: Session | null): Set<string> {
  const roles = new Set<string>()
  if (!session?.user) {
    return roles
  }

  const appMeta = session.user.app_metadata || {}
  const userMeta = session.user.user_metadata || {}

  for (const role of parseRoles(appMeta.role)) roles.add(role)
  for (const role of parseRoles(userMeta.role)) roles.add(role)
  for (const role of parseRoles(appMeta.roles)) roles.add(role)
  for (const role of parseRoles(userMeta.roles)) roles.add(role)

  return roles
}

function requiresAdminRole(pathname: string): boolean {
  return pathname === '/admin' || (pathname.startsWith('/admin/') && !pathname.startsWith('/admin/login'))
}

function requiresCustomerSession(pathname: string): boolean {
  return (
    pathname === '/kundencenter' ||
    (pathname.startsWith('/kundencenter/') && !pathname.startsWith('/kundencenter/login')) ||
    pathname === '/account' ||
    pathname.startsWith('/account/')
  )
}

function redirectUrl(request: NextRequest, pathname: string): URL {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  url.search = ''
  url.hash = ''
  return url
}

function loginRedirect(request: NextRequest, errorCode?: string) {
  const url = redirectUrl(request, '/login')
  const next = request.nextUrl.pathname + request.nextUrl.search
  url.searchParams.set('next', next)
  if (errorCode) {
    url.searchParams.set('error', errorCode)
  }
  return NextResponse.redirect(url)
}

function loginAliasRedirect(request: NextRequest, nextPathname: string) {
  const url = redirectUrl(request, '/login')
  url.searchParams.set('next', nextPathname)
  return NextResponse.redirect(url)
}

function forbiddenRedirect(request: NextRequest) {
  const url = redirectUrl(request, '/forbidden')
  return NextResponse.redirect(url)
}

export async function middleware(request: NextRequest) {
  const hostHeader = request.headers.get('host') || request.nextUrl.host
  const [hostname] = hostHeader.split(':')

  if (!request.nextUrl.pathname.startsWith('/api/')) {
    if (isSinA2AIndexHost(hostname) && !request.nextUrl.pathname.startsWith('/a2a')) {
      const rewriteURL = request.nextUrl.clone()
      rewriteURL.pathname = request.nextUrl.pathname === '/' ? '/a2a' : `/a2a${request.nextUrl.pathname}`
      return NextResponse.rewrite(rewriteURL)
    }

    const agent = findSinA2AAgentByGuideHost(hostname)
    if (agent && !request.nextUrl.pathname.startsWith(`/a2a/${agent.slug}`)) {
      const rewriteURL = request.nextUrl.clone()
      rewriteURL.pathname =
        request.nextUrl.pathname === '/'
          ? `/a2a/${agent.slug}`
          : `/a2a/${agent.slug}${request.nextUrl.pathname}`
      return NextResponse.rewrite(rewriteURL)
    }
  }

  if (request.nextUrl.pathname === '/admin/login') {
    return loginAliasRedirect(request, '/admin')
  }

  if (request.nextUrl.pathname === '/kundencenter/login') {
    return loginAliasRedirect(request, '/kundencenter')
  }

  if (!requiresAdminRole(request.nextUrl.pathname) && !requiresCustomerSession(request.nextUrl.pathname)) {
    return NextResponse.next()
  }

  if (!hasSupabaseAuthEnv()) {
    return loginRedirect(request, 'auth_config_missing')
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(requiredSupabaseUrl(), requiredSupabaseAnonKey(), {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        response.cookies.set({
          name,
          value,
          ...(options || {}),
        })
      },
      remove(name: string, options: any) {
        response.cookies.set({
          name,
          value: '',
          ...(options || {}),
          maxAge: 0,
        })
      },
    },
  })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return loginRedirect(request)
  }

  if (requiresAdminRole(request.nextUrl.pathname)) {
    const roles = sessionRoles(session)
    const hasPrivilegedRole = Array.from(roles).some((role) => ADMIN_ROLES.has(role))
    if (!hasPrivilegedRole) {
      return forbiddenRedirect(request)
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest).*)'],
}
