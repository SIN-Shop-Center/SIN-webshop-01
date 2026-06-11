// Purpose: DSGVO-Settings-Seite (Issue #43 UI)
// Docs: app/lib/actions/privacy.ts (Server Actions)

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PrivacyActions } from './privacy-actions'

export const metadata = {
  title: 'Datenschutz & Daten',
  robots: { index: false, follow: false },
}

export default async function PrivacyPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/konto/datenschutz')

  return (
    <main className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-semibold text-balance">
        Datenschutz &amp; Daten
      </h1>
      <p className="mb-8 text-sm text-muted-foreground leading-relaxed">
        Hier kannst du eine Kopie deiner Daten anfordern (Art. 20 DSGVO)
        oder dein Konto endgültig löschen (Art. 17 DSGVO).
      </p>
      <PrivacyActions />
    </main>
  )
}
