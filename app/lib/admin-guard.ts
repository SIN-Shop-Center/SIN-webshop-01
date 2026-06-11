// Purpose: Admin access guard (server-only, Step 8 of migration)
// Docs: PLAN-VERKAUFSFAEHIG.md (Step 8 — Admin Dashboard)
//
// SECURITY: Wirft nicht-eingeloggte User auf /auth/login und Nicht-Admins
// auf /. In JEDER Admin-Page und JEDER Admin-Action aufrufen — die Proxy
// prüft nur Login, nicht die Admin-Rolle (User-Metadata ist im Edge-Kontext
// nicht verlässlich frisch genug).

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

  return user
}
