// Purpose: Retry CJ forwarding button (client component, Step 8 + Step 10)
// Docs: PLAN-VERKAUFSFAEHIG.md

'use client'

import { useId, useState, useTransition } from 'react'
import { retryCjForwarding } from '@/lib/actions/admin'
import { AlertCircleIcon, SpinnerIcon } from '@/components/icons'

export function RetryCjButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const errorId = useId()

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
        type="button"
        onClick={handleRetry}
        disabled={isPending}
        className="btn btn-primary btn-md"
      >
        {isPending ? (
          <>
            <SpinnerIcon className="size-4 animate-spin" aria-hidden />
            Wird übertragen…
          </>
        ) : (
          'Erneut an CJ senden'
        )}
      </button>
      {error && (
        <p
          id={errorId}
          role="alert"
          className="flex max-w-60 items-start gap-1 text-right text-xs text-destructive"
        >
          <AlertCircleIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}
