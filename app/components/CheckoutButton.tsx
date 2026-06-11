// Purpose: Checkout button — triggers Stripe checkout, with error feedback (Step 4 + Step 10)
// Docs: PLAN-VERKAUFSFAEHIG.md

'use client'

import { useState, useTransition } from 'react'
import { startCheckout } from '@/lib/actions/checkout'
import { SpinnerIcon, AlertCircleIcon } from './icons'

export function CheckoutButton() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleCheckout() {
    setError(null)
    startTransition(async () => {
      try {
        await startCheckout()
      } catch (err) {
        if (err instanceof Error && err.message.includes('NEXT_REDIRECT')) {
          throw err
        }
        setError('Die Kasse konnte nicht geöffnet werden. Bitte versuche es erneut.')
      }
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleCheckout}
        disabled={isPending}
        className="btn btn-primary btn-lg w-full"
      >
        {isPending ? (
          <>
            <SpinnerIcon className="size-5 animate-spin" aria-hidden />
            Weiterleitung zu Stripe…
          </>
        ) : (
          'Zur Kasse'
        )}
      </button>
      {error && (
        <p
          role="alert"
          className="flex items-center gap-1.5 text-sm text-destructive"
        >
          <AlertCircleIcon className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  )
}
