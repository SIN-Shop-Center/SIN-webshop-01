'use client'

import { useState, useTransition } from 'react'
import { AlertCircle, ArrowRight, LoaderCircle, LockKeyhole } from 'lucide-react'
import { startCheckout } from '@/lib/actions/checkout'

export function CheckoutButton() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleCheckout() {
    setError(null)
    startTransition(async () => {
      const result = await startCheckout()
      if (result.error || !result.url) {
        setError(result.error ?? 'Checkout konnte nicht gestartet werden.')
        return
      }
      window.location.assign(result.url)
    })
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleCheckout}
        disabled={isPending}
        className="btn btn-primary btn-lg w-full"
      >
        {isPending ? (
          <>
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
            Sicherer Checkout wird geöffnet…
          </>
        ) : (
          <>
            Weiter zu Stripe
            <ArrowRight className="size-4" aria-hidden />
          </>
        )}
      </button>

      {error ? (
        <p role="alert" className="mt-3 flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}

      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <LockKeyhole className="size-3.5" aria-hidden />
        Lieferadresse, Versand und Zahlung werden bei Stripe erfasst.
      </p>
    </div>
  )
}
