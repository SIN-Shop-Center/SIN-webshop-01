// Purpose: Cart-item quantity stepper + remove — stock limit + error feedback
// Docs: PLAN-VERKAUFSFAEHIG.md (Step 3 + Step 10 a11y)

'use client'

import { useState, useTransition } from 'react'
import { updateCartQuantity, removeFromCart } from '@/lib/actions/cart'
import { MinusIcon, PlusIcon, TrashIcon, AlertCircleIcon } from './icons'

export function CartItemControls({
  itemId,
  quantity,
  stock,
}: {
  itemId: string
  quantity: number
  /** Available stock — caps the + button. Omit for no cap. */
  stock?: number
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const atMax = stock != null && quantity >= stock

  function run(action: () => Promise<unknown>) {
    setError(null)
    startTransition(async () => {
      try {
        await action()
      } catch {
        setError('Aktion fehlgeschlagen. Bitte versuche es erneut.')
      }
    })
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center rounded-lg border border-border">
          <button
            type="button"
            aria-label="Menge verringern"
            disabled={isPending || quantity <= 1}
            onClick={() => run(() => updateCartQuantity(itemId, quantity - 1))}
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
            disabled={isPending || atMax}
            onClick={() => run(() => updateCartQuantity(itemId, quantity + 1))}
            className="inline-flex h-9 w-9 items-center justify-center rounded-r-lg text-foreground/80 transition-colors hover:bg-muted disabled:opacity-50"
          >
            <PlusIcon className="size-4" aria-hidden />
          </button>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => removeFromCart(itemId))}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-destructive transition-colors hover:text-destructive/80 disabled:opacity-50"
        >
          <TrashIcon className="size-4" aria-hidden />
          Entfernen
        </button>
      </div>
      {atMax && !error && (
        <p className="text-xs text-muted-foreground">
          Maximale Bestellmenge erreicht ({stock} auf Lager).
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="flex items-center gap-1.5 text-xs text-destructive"
        >
          <AlertCircleIcon className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  )
}
