// Purpose: Cart item quantity controls (client component, Step 3)
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)

'use client'

import { useTransition } from 'react'
import { updateCartQuantity, removeFromCart } from '@/lib/actions/cart'

export function CartItemControls({ itemId, quantity }: { itemId: string; quantity: number }) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center rounded-lg border border-border">
        <button
          aria-label="Menge verringern"
          disabled={isPending}
          onClick={() => startTransition(() => updateCartQuantity(itemId, quantity - 1))}
          className="px-3 py-1 text-lg hover:bg-muted disabled:opacity-50"
        >
          −
        </button>
        <span className="min-w-8 text-center text-sm font-medium">{quantity}</span>
        <button
          aria-label="Menge erhöhen"
          disabled={isPending}
          onClick={() => startTransition(() => updateCartQuantity(itemId, quantity + 1))}
          className="px-3 py-1 text-lg hover:bg-muted disabled:opacity-50"
        >
          +
        </button>
      </div>
      <button
        disabled={isPending}
        onClick={() => startTransition(() => removeFromCart(itemId))}
        className="text-sm text-muted-foreground underline hover:text-foreground disabled:opacity-50"
      >
        Entfernen
      </button>
    </div>
  )
}
