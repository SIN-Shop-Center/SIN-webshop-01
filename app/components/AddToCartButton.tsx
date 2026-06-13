// Purpose: Add-to-cart button with pending/added/sold-out/error states (Step 3 + Step 10)
// Docs: PLAN-VERKAUFSFAEHIG.md

'use client'

import { useEffect, useState, useTransition } from 'react'
import { addToCart } from '@/lib/actions/cart'
import { CartIcon, CheckIcon, SpinnerIcon, AlertCircleIcon } from './icons'

export function AddToCartButton({
  productId,
  stock,
}: {
  productId: string
  stock: number
}) {
  const [isPending, startTransition] = useTransition()
  const [added, setAdded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!added) return
    const t = setTimeout(() => setAdded(false), 2000)
    return () => clearTimeout(t)
  }, [added])

  if (stock <= 0) {
    return (
      <button
        type="button"
        disabled
        className="btn btn-lg w-full"
        aria-disabled="true"
      >
        Ausverkauft
      </button>
    )
  }

  function handleAdd() {
    setError(null)
    startTransition(async () => {
      try {
        await addToCart(productId)
        setAdded(true)
        window.dispatchEvent(new Event('cart-updated'))
      } catch {
        setError('Das Produkt konnte nicht hinzugefügt werden. Bitte versuche es erneut.')
      }
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleAdd}
        disabled={isPending}
        className="btn btn-primary btn-lg w-full"
      >
        {isPending ? (
          <>
            <SpinnerIcon className="size-5 animate-spin" aria-hidden />
            Wird hinzugefügt…
          </>
        ) : added ? (
          <>
            <CheckIcon className="size-5" aria-hidden />
            Hinzugefügt
          </>
        ) : (
          <>
            <CartIcon className="size-5" aria-hidden />
            In den Warenkorb
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
        {added ? 'Produkt wurde zum Warenkorb hinzugefügt' : (error ?? '')}
      </span>
    </div>
  )
}
