// Purpose: Checkout page — multi-step with address, shipping, payment
// Docs: PLAN-VERKAUFSFAEHIG.md

import { getCartItems } from '@/lib/actions/cart'
import { getProductsByIds } from '@/lib/queries'
import { getShippingCents } from '@/lib/shipping'
import { formatEuro, toCents } from '@/lib/format'
import { CheckoutSteps } from '@/components/checkout/checkout-steps'
import { AddressForm } from '@/components/checkout/address-form'
import { ShippingMethodSelector } from '@/components/checkout/shipping-method-selector'
import { CheckoutButton } from '@/components/CheckoutButton'
import { TrustBadges } from '@/components/conversion/trust-badges'
import { ArrowLeftIcon } from '@/components/icons'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function CheckoutPage() {
  const items = await getCartItems()
  if (items.length === 0) redirect('/warenkorb')

  const products = await getProductsByIds(items.map((i) => i.product_id))
  const productMap = new Map(products.map((p) => [p.id, p]))

  const enriched = items
    .map((item) => {
      const product = productMap.get(item.product_id)
      return product ? { ...item, product } : null
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  const subtotalCents = enriched.reduce(
    (sum, item) => sum + toCents(item.product.price) * item.quantity,
    0,
  )
  const shippingCents = getShippingCents(subtotalCents)
  const grandTotalCents = subtotalCents + shippingCents

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/warenkorb"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
          Zurück zum Warenkorb
        </Link>
      </div>

      <h1 className="mb-2 text-3xl font-bold tracking-tight">Kasse</h1>
      <CheckoutSteps current={0} />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-8 lg:col-span-2">
          {/* ── Step 1: Adresse ──────────────────────────────────── */}
          <section>
            <AddressForm
              onChange={() => {}}
              onSubmit={() => {}}
            />
          </section>

          {/* ── Step 2: Versand ──────────────────────────────────── */}
          <section>
            <ShippingMethodSelector
              subtotalCents={subtotalCents}
              onSelect={() => {}}
            />
          </section>

          {/* ── Step 3: Zahlung (Stripe redirect) ────────────────── */}
          <section>
            <h3 className="mb-3 text-lg font-semibold">Zahlung</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Du wirst zur sicheren Zahlungsabwicklung von Stripe weitergeleitet.
              Dort kannst du per Kreditkarte, Lastschrift oder anderen Methoden
              bezahlen.
            </p>
            <CheckoutButton />
          </section>
        </div>

        {/* ── Order summary sidebar ────────────────────────────────── */}
        <aside className="h-fit rounded-lg border border-border bg-card p-6 lg:sticky lg:top-20">
          <h2 className="mb-4 text-lg font-semibold">Bestellübersicht</h2>

          <ul className="mb-4 flex flex-col gap-3 border-b border-border pb-4">
            {enriched.map((item) => (
              <li key={item.id} className="flex items-center gap-3 text-sm">
                <span className="flex-1 truncate">
                  {item.product.title}{' '}
                  <span className="text-muted-foreground">
                    × {item.quantity}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums">
                  {formatEuro(toCents(item.product.price) * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="flex flex-col gap-2 pb-4 text-sm">
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
          </dl>
          <div className="flex justify-between border-t border-border pt-4">
            <span className="font-semibold">Gesamt</span>
            <span className="text-lg font-bold tabular-nums">
              {formatEuro(grandTotalCents)}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Alle Preise inkl. gesetzlicher MwSt.
          </p>
          <div className="mt-4">
            <TrustBadges />
          </div>
        </aside>
      </div>
    </div>
  )
}
