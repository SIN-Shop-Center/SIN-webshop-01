// Purpose: Auth error page (Step 2 of migration)
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)

import Link from 'next/link'

export default function AuthErrorPage() {
  return (
    <div className="container mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="mb-4 text-2xl font-bold">Anmeldung fehlgeschlagen</h1>
      <p className="mb-6 text-muted-foreground">
        Etwas ist schiefgelaufen. Bitte versuche es erneut.
      </p>
      <Link href="/auth/login" className="font-medium text-primary underline">
        Zurück zur Anmeldung
      </Link>
    </div>
  )
}
