// Purpose: Add-to-cart button with pending/added/sold-out states (Step 3 + Step 10)
// Docs: PLAN-VERKAUFSFAEHIG.md

'use client'

import { useEffect, useState, useTransition } from 'react'
import { addToCart } from '@/lib/actions/cart'
import { CartIcon, CheckIcon, SpinnerIcon } from './icons'

export function AddToCartButton({
  productId,
  stock,
}: {
  productId: string
  stock: number
}) {
  const [isPending, startTransition] = useTransition()
  const [added, setAdded] = useState(false)

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
    startTransition(async () => {
      await addToCart(productId)
      setAdded(true)
    })
  }

  return (
    <>
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
      <span className="sr-only" aria-live="polite">
        {added ? 'Produkt wurde zum Warenkorb hinzugefügt' : ''}
      </span>
    </>
  )
}
