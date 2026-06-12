// Purpose: Manual retry button for a failed fulfillment
// Docs: AGENTS.md

'use client'

import { useState, useTransition } from 'react'
import { RotateCcw } from 'lucide-react'
import { retryFulfillment } from '@/app/actions/admin-fulfillment'

export function RetryFulfillmentButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null)
            const result = await retryFulfillment(orderId)
            if (result.error) setError(result.error)
          })
        }
        className="flex shrink-0 items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
      >
        <RotateCcw className={`size-4 ${isPending ? 'animate-spin' : ''}`} aria-hidden />
        {isPending ? 'Wird eingereicht…' : 'Erneut versuchen'}
      </button>
      {error && (
        <p role="alert" className="max-w-60 text-right text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
