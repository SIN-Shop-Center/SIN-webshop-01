// Purpose: Auth error page (Step 2 + Step 10 — AlertCircleIcon, better copy)
// Docs: PLAN-VERKAUFSFAEHIG.md

import Link from 'next/link'
import { AlertCircleIcon, ArrowLeftIcon } from '@/components/icons'

export default function AuthErrorPage() {
  return (
    <div className="container mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-6 inline-flex size-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircleIcon className="size-8 text-destructive" aria-hidden />
      </div>
      <h1 className="mb-3 text-2xl font-bold tracking-tight">
        Anmeldung fehlgeschlagen
      </h1>
      <p className="mb-8 max-w-sm text-pretty text-muted-foreground">
        Der Bestätigungslink ist möglicherweise abgelaufen oder bereits
        verwendet worden. Bitte versuche es erneut.
      </p>
      <Link href="/auth/login" className="btn btn-primary btn-md">
        <ArrowLeftIcon className="size-4" aria-hidden />
        Zurück zur Anmeldung
      </Link>
    </div>
  )
}
