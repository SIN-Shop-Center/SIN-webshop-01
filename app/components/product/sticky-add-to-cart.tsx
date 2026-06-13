'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { addToCart } from '@/lib/actions/cart'
import { formatEuro } from '@/lib/format'
import { CartIcon, CheckIcon, SpinnerIcon } from '@/components/icons'

interface StickyAddToCartProps {
  productId: string
  title: string
  priceCents: number
  originalPriceCents?: number | null
  stock: number
  variantLabel?: string | null
}

export function StickyAddToCart({
  productId,
  title,
  priceCents,
  originalPriceCents,
  stock,
  variantLabel,
}: StickyAddToCartProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [added, setAdded] = useState(false)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting)
      },
      { threshold: 0, rootMargin: '0px' },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!added) return
    const t = setTimeout(() => setAdded(false), 2000)
    return () => clearTimeout(t)
  }, [added])

  if (stock <= 0) return <div ref={sentinelRef} />

  function handleAdd() {
    startTransition(async () => {
      try {
        await addToCart(productId)
        setAdded(true)
      } catch {
        /* error handled by cart state */
      }
    })
  }

  const hasDiscount = originalPriceCents != null && originalPriceCents > priceCents

  return (
    <>
      <div ref={sentinelRef} className="h-0" aria-hidden />

      <div
        className={`pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md transition-transform duration-300 md:hidden ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
        role="complementary"
        aria-label="Schnellkauf"
      >
        <div className="container mx-auto flex items-center gap-4 px-4 py-3">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-xs text-muted-foreground">
              {title}
              {variantLabel && (
                <span className="ml-1 text-primary">· {variantLabel}</span>
              )}
            </span>
            <div className="flex items-baseline gap-2">
              <span className={`text-sm font-bold ${hasDiscount ? 'text-sale' : ''}`}>
                {formatEuro(priceCents)}
              </span>
              {hasDiscount && (
                <span className="text-xs text-muted-foreground line-through">
                  {formatEuro(originalPriceCents!)}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={isPending}
            className="btn btn-primary btn-lg shrink-0 px-4"
          >
            {isPending ? (
              <>
                <SpinnerIcon className="size-4 animate-spin" aria-hidden />
              </>
            ) : added ? (
              <>
                <CheckIcon className="size-4" aria-hidden />
              </>
            ) : (
              <>
                <CartIcon className="size-4" aria-hidden />
                In den Warenkorb
              </>
            )}
          </button>
        </div>
      </div>
    </>
  )
}
