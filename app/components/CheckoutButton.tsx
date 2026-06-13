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
      const result = await startCheckout()
      if (result.error || !result.url) {
        setError(result.error ?? 'Unbekannter Fehler.')
        return
      }
      window.location.href = result.url
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handleCheckout}
        disabled={isPending}
        className="btn btn-primary btn-lg w-full shadow-lg hover:shadow-xl transition-shadow"
      >
        {isPending ? (
          <>
            <SpinnerIcon className="size-5 animate-spin" aria-hidden />
            Weiterleitung zu Stripe…
          </>
        ) : (
          <>
            <svg className="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
            </svg>
            Sicher zur Kasse
          </>
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
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span>SSL-verschlüsselt · Käuferschutz</span>
      </div>
    </div>
  )
}
