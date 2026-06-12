// Purpose: TOTP-Challenge bei Login für bereits enrollte Admins (Issue #50)

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { VerifyForm } from './verify-form'

export default async function VerifyPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/admin')

  const { data: factors } = await supabase.auth.mfa.listFactors()
  const totp = factors?.totp?.[0]
  if (!totp) redirect('/admin/2fa/enroll')

  return (
    <main className="container mx-auto flex max-w-md flex-col gap-6 px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight">2FA-Bestätigung</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Gib den 6-stelligen Code aus deiner Authenticator-App ein.
      </p>
      <VerifyForm factorId={totp.id} />
    </main>
  )
}
