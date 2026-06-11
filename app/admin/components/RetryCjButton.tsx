// Purpose: Retry CJ forwarding button (client component, Step 8)
// Docs: PLAN-VERKAUFSFAEHIG.md (Step 8 — Admin Dashboard)

'use client'

import { useState, useTransition } from 'react'
import { retryCjForwarding } from '@/lib/actions/admin'

export function RetryCjButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleRetry() {
    setError(null)
    startTransition(async () => {
      const result = await retryCjForwarding(orderId)
      if (!result.ok) {
        setError(result.error ?? 'Unbekannter Fehler')
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleRetry}
        disabled={isPending}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {isPending ? 'Wird übertragen…' : 'Erneut an CJ senden'}
      </button>
      {error && (
        <p className="max-w-60 text-right text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}
