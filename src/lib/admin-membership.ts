import 'server-only'

import { createPublicAdminClient } from '@/lib/supabase/admin'

export async function hasAdminMembership(userId: string): Promise<boolean> {
  if (!userId) return false

  const admin = createPublicAdminClient()
  const { data, error } = await admin
    .from('admin_users')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('[admin-membership] lookup failed:', error.message)
    return false
  }
  return Boolean(data)
}
