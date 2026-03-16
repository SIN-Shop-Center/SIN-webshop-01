'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from '@/components/ui/Link'
import { ArrowLeft, ArrowRight, Minus, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { ProductGrid } from '@/components/products/ProductGrid'
import { Button } from '@/components/ui/Button'
import { CheckoutNextSteps, FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING_COST } from '@/features/checkout'
import { getComplementaryProducts, getRecentlyViewedProducts, loadCatalogProducts } from '@/features/catalog'
import { CHECKOUT_TRUST_SIGNALS, TrustPanel } from '@/features/trust'
import { useCustomerSegmentStore } from '@/features/segment/store'
import { trackEvent } from '@/lib/analytics'
import { useCartStore, useCommerceStore } from '@/lib/store'
import { formatPrice } from '@/lib/utils'
import type { Product } from '@/types'

export default function CartPage() {
  const items = useCartStore((state) => state.items)
  const total = useCartStore((state) => state.total)
  const itemCount = useCartStore((state) => state.itemCount)
  const recentlyViewedIds = useCommerceStore((state) => state.recentlyViewedIds)
  const segment = useCustomerSegmentStore((state) => state.segment)
  const clearCart = useCartStore((state) => state.clearCart)
  const removeItem = useCartStore((state) => state.removeItem)
  const updateQuantity = useCartStore((state) => state.updateQuantity)
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([])
  const shippingCost = total >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_COST
  const remainingFreeShipping = Math.max(FREE_SHIPPING_THRESHOLD - total, 0)
  const shippingProgress = Math.max(0, Math.min((total / FREE_SHIPPING_THRESHOLD) * 100, 100))
  const grandTotal = total + shippingCost
  const recommendedProducts = useMemo(() => getComplementaryProducts(catalogProducts, items, 4), [catalogProducts, items])
  const recentlyViewedProducts = useMemo(
    () =>
      getRecentlyViewedProducts(
        catalogProducts.filter((product) => !items.some((item) => item.product.id === product.id)),
        recentlyViewedIds.filter((productId) => !items.some((item) => item.product.id === productId)),
        4,
      ),
    [catalogProducts, items, recentlyViewedIds],
  )

  useEffect(() => {
    let active = true
    const run = async () => {
      try {
        const loadedProducts = await loadCatalogProducts({ limit: 120 })
        if (active) {
          setCatalogProducts(loadedProducts)
        }
      } catch {
        if (active) {
          setCatalogProducts([])
        }
      }
    }

    void run()
    return () => {
      active = false
    }
  }, [])

  if (items.length === 0) {
    return (
      <main className="shell-container py-12">
        <section className="rounded-[2rem] border border-brand-border bg-white px-8 py-16 text-center shadow-[0_18px_44px_rgba(18,18,18,0.06)]">
          <h1 className="text-4xl">Dein Warenkorb ist leer</h1>
          <p className="mx-auto mt-3 max-w-xl text-brand-text-muted">Lege zuerst Produkte in den Warenkorb. Danach führt dich der Checkout ohne unnötige Ablenkung weiter.</p>
          <Link href="/products" className="cta-primary mt-6 inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm transition-all duration-150">
            <ArrowLeft className="h-4 w-4" />
            <span>Zum Sortiment</span>
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className="shell-container py-10">
      <header className="mb-7 rounded-[2rem] border border-brand-border bg-brand-surface px-6 py-7 shadow-[0_18px_44px_rgba(18,18,18,0.06)]">
        <Link href="/products" className="ui-pill ui-pill-muted text-sm gap-2">
          <ArrowLeft className="h-4 w-4" />
          Weiter einkaufen
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl">Warenkorb</h1>
            <p className="mt-2 max-w-2xl text-brand-text-muted">{itemCount} Artikel. Preise, Versand und Gesamtkosten bleiben vor dem Checkout klar sichtbar.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-brand-text-muted">
            <span className="rounded-full border border-brand-border bg-white px-3 py-1.5">Klare Gesamtkosten</span>
            <span className="rounded-full border border-brand-border bg-white px-3 py-1.5">Sicherer Checkout</span>
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        <section className="space-y-4">
          {items.map((item) => (
            <article key={item.id} className="rounded-[1.6rem] border border-brand-border bg-white p-4 shadow-[0_10px_26px_rgba(18,18,18,0.04)]">
              <div className="flex gap-4">
                <div className="relative h-24 w-24 overflow-hidden rounded-2xl bg-brand-bg">
                  <Image src={item.image} alt={item.name} fill className="object-contain p-2.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/products/${item.product.id}`}
                    prefetch={false}
                    className="line-clamp-2 text-base font-semibold text-brand-text hover:text-black"
                  >
                    {item.name}
                  </Link>
                  <p className="mt-1 text-sm text-brand-text-muted">Einzelpreis: {formatPrice(item.price)}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center rounded-full border border-brand-border bg-brand-bg p-1">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, Math.max(1, item.quantity - 1))}
                        disabled={item.quantity <= 1}
                        className={[
                          'ui-icon-btn hover:bg-white',
                          item.quantity <= 1 ? 'cursor-not-allowed opacity-50 hover:bg-transparent' : '',
                        ].join(' ')}
                        aria-label={`Menge reduzieren für ${item.name}`}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-10 text-center text-sm font-semibold text-brand-text">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="ui-icon-btn hover:bg-white"
                        aria-label={`Menge erhöhen für ${item.name}`}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.product.id)}
                      className="ui-icon-btn hover:bg-red-50 hover:text-red-600"
                      aria-label={`Artikel ${item.name} entfernen`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="text-right text-base font-semibold text-brand-text">{formatPrice(item.price * item.quantity)}</p>
              </div>
            </article>
          ))}
          <div className="flex justify-end">
            <Button type="button" onClick={clearCart} variant="outline" size="sm">
              Warenkorb leeren
            </Button>
          </div>

          {recommendedProducts.length > 0 ? (
            <section className="rounded-[1.7rem] border border-brand-border bg-white p-5 shadow-[0_10px_26px_rgba(18,18,18,0.05)]">
              <div className="mb-5">
                <p className="section-eyebrow">Sekundäre Empfehlung</p>
                <h2 className="mt-2 text-3xl">Oft sinnvoll zusammen</h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-brand-text-muted">
                  Diese Produkte ergänzen deinen Warenkorb, ohne den Checkout-CTA zu verdrängen.
                </p>
              </div>
              <ProductGrid products={recommendedProducts} columns={3} />
            </section>
          ) : null}

          {recentlyViewedProducts.length > 0 ? (
            <section className="rounded-[1.7rem] border border-brand-border bg-white p-5 shadow-[0_10px_26px_rgba(18,18,18,0.05)]">
              <div className="mb-5">
                <p className="section-eyebrow">Wieder aufnehmen</p>
                <h2 className="mt-2 text-3xl">Zuletzt angesehen</h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-brand-text-muted">
                  Falls du noch zwischen Produkten wechselst, bleiben die letzten Ansichten griffbereit.
                </p>
              </div>
              <ProductGrid products={recentlyViewedProducts} columns={3} />
            </section>
          ) : null}
        </section>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <section className="rounded-[1.7rem] border border-brand-border bg-white p-5 shadow-[0_12px_30px_rgba(10,10,10,0.06)]">
            <h2 className="text-2xl">Bestellübersicht</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between"><dt className="text-brand-text-muted">Zwischensumme</dt><dd className="font-medium text-brand-text">{formatPrice(total)}</dd></div>
              <div className="flex items-center justify-between"><dt className="text-brand-text-muted">Versand</dt><dd className="font-medium text-brand-text">{shippingCost === 0 ? 'Kostenlos' : formatPrice(shippingCost)}</dd></div>
              <div className="flex items-center justify-between border-t border-brand-border pt-3 text-base"><dt className="font-semibold text-brand-text">Gesamt</dt><dd className="font-semibold text-brand-text">{formatPrice(grandTotal)}</dd></div>
            </dl>
            <p className="mt-1 text-xs text-brand-text-muted">inkl. MwSt., ohne versteckte Zusatzkosten</p>
            <div className="mt-4 rounded-2xl border border-brand-border bg-brand-bg px-3 py-3">
              {shippingCost > 0 ? <p className="text-xs text-brand-text-muted">Noch {formatPrice(remainingFreeShipping)} bis zum kostenlosen Versand.</p> : <p className="text-xs font-semibold text-brand-success">Kostenloser Versand aktiv</p>}
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white" role="progressbar" aria-label="Fortschritt zum kostenlosen Versand" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(shippingProgress)}>
                <div className="h-full rounded-full bg-black transition-[width] duration-300" style={{ width: `${shippingProgress}%` }} />
              </div>
            </div>
            <CheckoutNextSteps className="mt-4 text-sm text-brand-text-muted" />
            <Link
              href="/checkout"
              onClick={() => void trackEvent('begin_checkout', { payload: { item_count: itemCount, total: grandTotal } })}
              className="cta-primary mt-5 inline-flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-full px-7 py-3 text-base font-semibold shadow-sm transition-all duration-150"
            >
              <span>Sicher zur Kasse</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-3 inline-flex items-center gap-1 text-xs text-brand-text-muted">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-text" />
              {segment === 'b2b' ? 'SSL-gesicherte Verarbeitung plus Firmenangaben im Checkout' : 'SSL-gesicherte Verarbeitung und klare Bestellprüfung'}
            </p>
          </section>
          <TrustPanel title="Sicherer Einkauf" signals={CHECKOUT_TRUST_SIGNALS} compact />
        </aside>
      </div>
    </main>
  )
}
