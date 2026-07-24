// Purpose: Error boundary for /produkt/[id] route
// Docs: PLAN-VERKAUFSFAEHIG.md

'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { AlertCircleIcon, ArrowLeftIcon } from '@/components/icons'

export default function ProductError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[produkt/[id]/error.tsx]', error)
  }, [error])

  return (
    <div className="container mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-12 text-center">
      <AlertCircleIcon
        className="mb-4 size-12 text-destructive"
        aria-hidden
      />
      <h1 className="mb-2 text-2xl font-bold">Fehler beim Laden des Produkts</h1>
      <p className="mb-6 text-pretty text-muted-foreground">
        Das Produkt konnte nicht geladen werden. Bitte versuche es erneut.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="btn btn-primary btn-md"
        >
          Erneut versuchen
        </button>
        <Link href="/" className="btn btn-outline btn-md">
          <ArrowLeftIcon className="size-4" aria-hidden />
          Zur Übersicht
        </Link>
      </div>
    </div>
  )
}
