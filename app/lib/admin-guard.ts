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
import { createClient } from '@/lib/supabase/server'

export async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')
  if (user.user_metadata?.is_admin !== true) redirect('/')

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
