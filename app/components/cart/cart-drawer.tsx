// Purpose: Slide-out cart drawer — loads cart on open, supports qty update + remove
// Docs: AGENTS.md

'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { getCartItemsWithProducts, type CartLineItem } from '@/lib/actions/cart'
import { CartItemRow } from '@/components/cart/cart-item-row'
import { CheckoutButton } from '@/components/CheckoutButton'
import { formatEuro, toCents } from '@/lib/format'
import { getShippingCents } from '@/lib/shipping-client'
import { SHIPPING } from '@/lib/shipping-constants'
import { X, ShoppingBag, ArrowRight } from 'lucide-react'

export function CartDrawer() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<CartLineItem[]>([])
  const [loading, startTransition] = useTransition()

  function loadCart() {
    startTransition(async () => {
      try {
        const data = await getCartItemsWithProducts()
        setItems(data)
      } catch {
        setItems([])
      }
    })
  }

  useEffect(() => {
    function handleOpen() {
      loadCart()
      setOpen(true)
    }
    function handleUpdate() {
      if (open) loadCart()
    }
    window.addEventListener('open-cart', handleOpen)
    window.addEventListener('cart-updated', handleUpdate)
    return () => {
      window.removeEventListener('open-cart', handleOpen)
      window.removeEventListener('cart-updated', handleUpdate)
    }
  }, [open])

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const subtotalCents = items.reduce(
    (sum, { item, product }) => sum + toCents(product.price) * item.quantity,
    0,
  )
  const shippingCents = getShippingCents(subtotalCents)
  const grandTotalCents = subtotalCents + shippingCents
  const missingForFreeCents = Math.max(0, SHIPPING.freeAboveCents - subtotalCents)
  const qualifiesForFreeShipping = shippingCents === 0

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <ShoppingBag className="size-5" aria-hidden="true" />
            Warenkorb
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
              {items.reduce((sum, { item }) => sum + item.quantity, 0)}
            </span>
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Warenkorb schließen"
            className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading && items.length === 0 ? (
            <div className="flex h-40 items-center justify-center">
              <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShoppingBag className="mb-4 size-16 text-muted-foreground/40" aria-hidden="true" />
              <p className="text-lg font-semibold">Dein Warenkorb ist leer</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Entdecke unsere Produkte und lege deine Favoriten hinein.
              </p>
              <Link
                href="/produkte"
                onClick={() => setOpen(false)}
                className="btn btn-primary btn-md mt-6"
              >
                Jetzt stöbern
              </Link>
            </div>
          ) : (
            <ul className="flex flex-col gap-4">
              {items.map(({ item, product }) => (
                <CartItemRow key={item.id} item={{ ...item, product }} />
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-border p-5">
            {qualifiesForFreeShipping ? (
              <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-success">
                Du erhältst kostenlosen Versand!
              </p>
            ) : (
              <p className="mb-3 text-sm text-muted-foreground">
                Noch{' '}
                <span className="font-semibold text-foreground">{formatEuro(missingForFreeCents)}</span>{' '}
                bis zum kostenlosen Versand.
              </p>
            )}

            <dl className="mb-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Zwischensumme</dt>
                <dd className="tabular-nums">{formatEuro(subtotalCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Versand</dt>
                <dd className="tabular-nums">
                  {shippingCents === 0 ? 'Kostenlos' : formatEuro(shippingCents)}
                </dd>
              </div>
              <div className="flex justify-between text-base font-bold">
                <dt>Gesamt</dt>
                <dd className="tabular-nums">{formatEuro(grandTotalCents)}</dd>
              </div>
            </dl>

            <CheckoutButton />

            <Link
              href="/warenkorb"
              onClick={() => setOpen(false)}
              className="mt-3 flex items-center justify-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              Zum Warenkorb <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
