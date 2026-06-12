// Purpose: TOTP-Enrollment für Admins (Issue #50)
//
// Henne-Ei-Situation: diese Seite darf requireAdmin() NICHT nutzen
// (würde in Endlosschleife enden), nur Login + is_admin prüfen.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EnrollForm } from './enroll-form'

export default async function EnrollPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/admin')

  const { data: isAdmin } = await supabase.rpc('is_admin')
  if (!isAdmin) redirect('/')

  return (
    <main className="container mx-auto flex max-w-md flex-col gap-6 px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight">
        Zwei-Faktor-Authentifizierung einrichten
      </h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Der Admin-Bereich erfordert 2FA. Scanne den QR-Code mit einer
        Authenticator-App (z. B. Aegis, Google Authenticator) und bestätige
        mit einem 6-stelligen Code.
      </p>
      <EnrollForm />
    </main>
  )
}
