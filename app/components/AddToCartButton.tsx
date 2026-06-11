// Purpose: Add-to-cart button (client component, Step 3)
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)

'use client'

import { useState, useTransition } from 'react'
import { addToCart } from '@/lib/actions/cart'

export function AddToCartButton({ productId, stock }: { productId: string; stock: number }) {
  const [isPending, startTransition] = useTransition()
  const [added, setAdded] = useState(false)

  function handleAdd() {
    startTransition(async () => {
      await addToCart(productId)
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
    })
  }

  if (stock <= 0) {
    return (
      <button
        disabled
        className="w-full rounded-lg bg-muted px-6 py-3 font-semibold text-muted-foreground"
      >
        Ausverkauft
      </button>
    )
  }

  return (
    <button
      onClick={handleAdd}
      disabled={isPending}
      className="w-full rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
    >
      {isPending ? 'Wird hinzugefügt…' : added ? 'Hinzugefügt' : 'In den Warenkorb'}
    </button>
  )
}
