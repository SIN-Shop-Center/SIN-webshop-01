import type { Session } from '@supabase/supabase-js'
import { createRouteSupabaseClient } from '@/lib/supabase-server'

const ADMIN_ROLES = new Set(['admin', 'ops'])

function parseRoles(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim().toLowerCase() : ''))
      .filter(Boolean)
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
  for (const role of parseRoles(appMeta.roles)) roles.add(role)
  for (const role of parseRoles(userMeta.role)) roles.add(role)
  for (const role of parseRoles(userMeta.roles)) roles.add(role)
  return roles
}

export async function requireAdminSession() {
  const supabase = createRouteSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('admin_session_missing')
  }

  const hasRole = Array.from(sessionRoles(session)).some((role) => ADMIN_ROLES.has(role))
  if (!hasRole) {
    throw new Error('admin_session_forbidden')
  }

  return session
}
