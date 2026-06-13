// Purpose: Global error boundary (Step 10 — UX safety net)
// Docs: PLAN-VERKAUFSFAEHIG.md

'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { AlertCircleIcon } from './components/icons'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Server-side error logging
    console.error('[app/error.tsx]', error)
  }, [error])

  return (
    <div className="container mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-12 text-center">
      <AlertCircleIcon
        className="mb-4 size-12 text-destructive"
        aria-hidden
      />
      <h1 className="mb-2 text-2xl font-bold">Etwas ist schiefgelaufen</h1>
      <p className="mb-6 text-muted-foreground text-pretty">
        Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut —
        sollte der Fehler bestehen bleiben, melde dich gerne bei uns.
      </p>
      <pre className="mb-4 max-w-2xl overflow-auto rounded bg-muted p-4 text-left text-xs">
        {error.message}
      </pre>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="btn btn-primary btn-md"
        >
          Erneut versuchen
        </button>
        <Link href="/kontakt" className="btn btn-outline btn-md">
          Kontakt
        </Link>
      </div>
    </div>
  )
}
