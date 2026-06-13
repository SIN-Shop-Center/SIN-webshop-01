// Purpose: Reorder button — adds all order items to cart (client component)
// Docs: AGENTS.md

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { reorderItems } from '@/lib/actions/orders'
import { CartIcon, SpinnerIcon, AlertCircleIcon, CheckIcon } from '@/components/icons'

export function ReorderButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ added: number; unavailable: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function handleReorder() {
    setError(null)
    setResult(null)
    startTransition(async () => {
      try {
        const res = await reorderItems(orderId)
        setResult(res)
        router.refresh()
      } catch {
        setError('Nachbestellung fehlgeschlagen. Bitte versuche es erneut.')
      }
    })
  }

  if (result && result.added > 0) {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled
          className="btn btn-primary btn-md inline-flex w-fit items-center gap-2 opacity-80"
        >
          <CheckIcon className="size-4" aria-hidden />
          {result.added} Artikel im Warenkorb
        </button>
        {result.unavailable.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Nicht verfügbar: {result.unavailable.join(', ')}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleReorder}
        disabled={isPending}
        className="btn btn-primary btn-md inline-flex w-fit items-center gap-2"
      >
        {isPending ? (
          <>
            <SpinnerIcon className="size-4 animate-spin" aria-hidden />
            Wird hinzugefügt…
          </>
        ) : (
          <>
            <CartIcon className="size-4" aria-hidden />
            Nochmal bestellen
          </>
        )}
      </button>
      {error && (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircleIcon className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
      <span className="sr-only" role="status" aria-live="polite">
        {result ? `${result.added} Artikel zum Warenkorb hinzugefügt` : ''}
      </span>
    </div>
  )
}
