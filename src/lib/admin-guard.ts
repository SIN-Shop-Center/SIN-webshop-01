// Purpose: Admin access guard with MFA (AAL2) enforcement (Issue #50)
// Docs: https://supabase.com/docs/guides/auth/auth-mfa
//
// SECURITY:
// - Unauthenticated → /auth/login
// - Not admin → /
// - No TOTP enrolled → /admin/2fa/enroll
// - TOTP enrolled but session is aal1 → /admin/2fa/verify
// - Only aal2 + is_admin → grant access

import 'server-only'

import { redirect } from 'next/navigation'
import { hasAdminMembership } from '@/lib/admin-membership'
import { createClient } from '@/lib/supabase/server'

export async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Never authorize with user_metadata: authenticated users can update their
  // own user metadata. Membership is operator-managed in public.admin_users.
  if (!(await hasAdminMembership(user.id))) redirect('/')

  // Issue #50: 2FA-Pflicht für Admins.
  // currentLevel 'aal1' + nextLevel 'aal2' => TOTP enrolled, aber nicht verifiziert
  // currentLevel 'aal1' + nextLevel 'aal1' => noch kein TOTP enrolled
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

  if (aal?.currentLevel !== 'aal2') {
    if (aal?.nextLevel === 'aal2') {
      redirect('/admin/2fa/verify')
    }
    redirect('/admin/2fa/enroll')
  }

  return user
}
