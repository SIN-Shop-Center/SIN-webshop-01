// Purpose: Checkout button — triggers Stripe checkout (Step 4 + Step 10)
// Docs: PLAN-VERKAUFSFAEHIG.md

'use client'

import { useTransition } from 'react'
import { startCheckout } from '@/lib/actions/checkout'
import { SpinnerIcon } from './icons'

export function CheckoutButton() {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      type="button"
      onClick={() => startTransition(() => startCheckout())}
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
  )
}
