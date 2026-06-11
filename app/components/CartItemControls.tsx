// Purpose: Cart-item quantity stepper + remove (Step 3 + Step 10 a11y)
// Docs: PLAN-VERKAUFSFAEHIG.md

'use client'

import { useTransition } from 'react'
import { updateCartQuantity, removeFromCart } from '@/lib/actions/cart'
import { MinusIcon, PlusIcon, TrashIcon } from './icons'

export function CartItemControls({
  itemId,
  quantity,
}: {
  itemId: string
  quantity: number
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex items-center gap-3">
      <div className="inline-flex items-center rounded-lg border border-border">
        <button
          type="button"
          aria-label="Menge verringern"
          disabled={isPending || quantity <= 1}
          onClick={() =>
            startTransition(() => updateCartQuantity(itemId, quantity - 1))
          }
          className="inline-flex h-9 w-9 items-center justify-center rounded-l-lg text-foreground/80 transition-colors hover:bg-muted disabled:opacity-50"
        >
          <MinusIcon className="size-4" aria-hidden />
        </button>
        <span
          aria-live="polite"
          className="min-w-10 px-2 text-center text-sm font-medium tabular-nums"
        >
          {quantity}
        </span>
        <button
          type="button"
          aria-label="Menge erhöhen"
          disabled={isPending}
          onClick={() =>
            startTransition(() => updateCartQuantity(itemId, quantity + 1))
          }
          className="inline-flex h-9 w-9 items-center justify-center rounded-r-lg text-foreground/80 transition-colors hover:bg-muted disabled:opacity-50"
        >
          <PlusIcon className="size-4" aria-hidden />
        </button>
      </div>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => removeFromCart(itemId))}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-destructive transition-colors hover:text-destructive/80 disabled:opacity-50"
      >
        <TrashIcon className="size-4" aria-hidden />
        Entfernen
      </button>
    </div>
  )
}
