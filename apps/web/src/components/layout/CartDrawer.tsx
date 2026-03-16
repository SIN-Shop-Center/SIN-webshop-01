'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from '@/components/ui/Link'
import { Minus, Plus, Trash2, X } from 'lucide-react'
import { CheckoutNextSteps, FREE_SHIPPING_THRESHOLD } from '@/features/checkout'
import { useCartStore, useUIStore } from '@/lib/store'
import { formatPrice } from '@/lib/utils'

export function CartDrawer() {
  const items = useCartStore((state) => state.items)
  const itemCount = useCartStore((state) => state.itemCount)
  const removeItem = useCartStore((state) => state.removeItem)
  const updateQuantity = useCartStore((state) => state.updateQuantity)
  const total = useCartStore((state) => state.total)
  const isCartOpen = useUIStore((state) => state.isCartOpen)
  const closeCart = useUIStore((state) => state.closeCart)
  const remainingFreeShipping = Math.max(FREE_SHIPPING_THRESHOLD - total, 0)
  const shippingProgress = Math.max(0, Math.min((total / FREE_SHIPPING_THRESHOLD) * 100, 100))
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!isCartOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeCart()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    closeButtonRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [closeCart, isCartOpen])
  if (!isCartOpen) return null

  return (
    <>
      <button type="button" onClick={closeCart} className="fixed inset-0 z-40 bg-black/38 backdrop-blur-sm" aria-label="Warenkorb schließen" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-heading"
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-brand-border bg-brand-surface shadow-2xl animate-fade-in"
      >
        <header className="border-b border-brand-border px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 id="cart-drawer-heading" className="text-lg font-semibold text-brand-text">
                Warenkorb ({itemCount})
              </h2>
              <p className="mt-1 text-sm text-brand-text-muted">Preis, Menge und nächster Schritt bleiben direkt klar.</p>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeCart}
              className="ui-icon-btn"
              aria-label="Warenkorb schließen"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="rounded-[1.5rem] border border-brand-border bg-white px-6 py-10 text-center">
              <p className="text-lg font-semibold text-brand-text">Dein Warenkorb ist leer.</p>
              <p className="mt-2 text-sm text-brand-text-muted">Lege Produkte ab, prüfe den Preis und starte danach den fokussierten Checkout.</p>
              <Link href="/products" onClick={closeCart} className="mt-5 inline-flex min-h-[2.75rem] items-center rounded-full border border-brand-border px-4 py-2 text-sm font-semibold text-brand-text hover:border-black hover:text-black">
                Sortiment ansehen
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <article key={item.id} className="rounded-[1.35rem] border border-brand-border bg-white p-3">
                  <div className="flex gap-3">
                    <div className="relative h-20 w-20 overflow-hidden rounded-xl bg-brand-bg">
                      <Image src={item.image} alt={item.name} fill className="object-contain p-2" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-semibold text-brand-text">{item.name}</p>
                      <p className="mt-1 text-sm text-brand-text">{formatPrice(item.price)}</p>
                      <p className="mt-1 text-xs text-brand-text-muted">{formatPrice(item.price * item.quantity)} gesamt</p>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, Math.max(1, item.quantity - 1))}
                          disabled={item.quantity <= 1}
                          className={[
                            'ui-icon-btn',
                            item.quantity <= 1 ? 'cursor-not-allowed opacity-50' : '',
                          ].join(' ')}
                          aria-label={`Menge reduzieren für ${item.name}`}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium text-brand-text">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="ui-icon-btn"
                          aria-label={`Menge erhöhen für ${item.name}`}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(item.product.id)}
                          className="ml-auto inline-flex min-h-[2.75rem] min-w-[2.75rem] items-center justify-center rounded-full border border-transparent text-brand-text-muted transition-colors hover:border-brand-border hover:bg-red-50 hover:text-red-600"
                          aria-label={`Artikel ${item.name} entfernen`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
        {items.length > 0 ? (
          <footer className="border-t border-brand-border px-5 py-4">
            <div className="mb-3 rounded-xl border border-brand-border bg-brand-bg px-3 py-3">
              {remainingFreeShipping > 0 ? (
                <p className="text-xs text-brand-text-muted">
                  Noch {formatPrice(remainingFreeShipping)} bis kostenloser Versand.
                </p>
              ) : (
                <p className="text-xs font-semibold text-brand-success">Kostenloser Versand aktiv</p>
              )}
              <div
                className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white"
                role="progressbar"
                aria-label="Fortschritt zum kostenlosen Versand"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(shippingProgress)}
              >
                <div className="h-full rounded-full bg-black transition-[width] duration-300" style={{ width: `${shippingProgress}%` }} />
              </div>
            </div>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-brand-text-muted">Zwischensumme für {itemCount} Artikel</span>
              <span className="text-xl font-semibold text-brand-text">{formatPrice(total)}</span>
            </div>
            <CheckoutNextSteps title="Im Checkout" compact className="mb-3 bg-brand-bg" />
            <p className="mb-3 text-xs text-brand-text-muted">Versandkosten und Rückgabehinweise bleiben im Checkout sichtbar.</p>
            <Link href="/checkout" onClick={closeCart} className="cta-primary block w-full px-4 py-3 text-center text-sm font-semibold">
              Sicher zur Kasse
            </Link>
            <Link href="/cart" onClick={closeCart} className="mt-2 inline-flex min-h-[2.75rem] items-center justify-center text-center text-sm font-medium text-brand-text-muted hover:text-brand-text">
              Warenkorb im Detail ansehen
            </Link>
          </footer>
        ) : null}
      </aside>
    </>
  )
}
