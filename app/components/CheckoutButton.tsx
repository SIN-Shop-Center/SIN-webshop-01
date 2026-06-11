// Purpose: Checkout button — triggers Stripe checkout (Step 4 of migration)
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)

'use client'

import { useTransition } from 'react'
import { startCheckout } from '@/lib/actions/checkout'

export function CheckoutButton() {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(() => startCheckout())}
      disabled={isPending}
      className="w-full rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
    >
      {isPending ? 'Weiterleitung zu Stripe…' : 'Zur Kasse'}
    </button>
  )
}
