// Purpose: Error boundary for /produkt/[id] route (debug)
// Docs: PLAN-VERKAUFSFAEHIG.md
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-red-600">Fehler beim Laden des Produkts</h1>
      <p className="mt-4 text-muted-foreground">Es ist ein Fehler aufgetreten. Bitte versuche es erneut.</p>
      <pre className="mt-4 max-w-2xl overflow-auto rounded bg-muted p-4 text-xs">
{`Error: ${error.message}
Digest: ${error.digest}
Stack: ${error.stack?.split('\n').slice(0, 5).join('\n')}`}
      </pre>
      <button
        onClick={reset}
        className="mt-4 rounded-lg bg-primary px-4 py-2 text-primary-foreground"
      >
        Erneut versuchen
      </button>
    </div>
  )
}
