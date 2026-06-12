// Purpose: Quick-add to cart button on product card hover
// Docs: AGENTS.md

'use client'

import { useTransition, useState } from 'react'
import { ShoppingCart, Check } from 'lucide-react'
import { addToCart } from '@/lib/actions/cart'

export function CardQuickAdd({ productId }: { productId: string }) {
  const [isPending, startTransition] = useTransition()
  const [added, setAdded] = useState(false)

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    startTransition(async () => {
      try {
        await addToCart(productId, 1)
        setAdded(true)
        window.dispatchEvent(new Event('cart-updated'))
        setTimeout(() => setAdded(false), 2000)
      } catch {
        /* ignore */
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="flex w-full items-center justify-center gap-2 rounded-md bg-foreground/90 px-3 py-2 text-sm font-medium text-background backdrop-blur-sm transition-colors hover:bg-foreground disabled:opacity-60"
    >
      {added ? (
        <>
          <Check className="size-4" aria-hidden /> Hinzugefügt
        </>
      ) : (
        <>
          <ShoppingCart className="size-4" aria-hidden />
          {isPending ? 'Wird hinzugefügt…' : 'In den Warenkorb'}
        </>
      )}
    </button>
  )
}
