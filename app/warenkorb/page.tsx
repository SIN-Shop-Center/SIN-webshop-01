// Purpose: Cart page — mobile-first item layout, sticky mobile checkout bar,
// free-shipping progress (Step 3 + Step 10)
// Docs: PLAN-VERKAUFSFAEHIG.md

import Link from 'next/link'
import Image from 'next/image'
import { getCartItems } from '@/lib/actions/cart'
import { getProductsByIds } from '@/lib/queries'
import { CartItemControls } from '@/components/CartItemControls'
import { CheckoutButton } from '@/components/CheckoutButton'
import { SHIPPING, getShippingCents } from '@/lib/shipping'
import { formatEuro, toCents } from '@/lib/format'
import { CartIcon, ArrowRightIcon } from '@/components/icons'
import { RelatedProducts } from '@/components/related-products'
import { CartUrgency } from '@/components/conversion/cart-urgency'
import { CheckoutSteps } from '@/components/conversion/checkout-steps'
import { TrustBadges } from '@/components/conversion/trust-badges'

export const dynamic = 'force-dynamic'

export default async function CartPage() {
  const items = await getCartItems()

  const products = await getProductsByIds(items.map((i) => i.product_id))
  const productMap = new Map(products.map((p) => [p.id, p]))

  const enriched = items
    .map((item) => {
      const product = productMap.get(item.product_id)
      return product ? { ...item, product } : null
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  const totalQuantity = enriched.reduce((sum, item) => sum + item.quantity, 0)
  const subtotalCents = enriched.reduce(
    (sum, item) => sum + toCents(item.product.price) * item.quantity,
    0,
  )
  const shippingCents = getShippingCents(subtotalCents)
  const grandTotalCents = subtotalCents + shippingCents
  const missingForFreeCents = Math.max(
    0,
    SHIPPING.freeAboveCents - subtotalCents,
  )
  const freeShippingProgress = Math.min(
    100,
    Math.round((subtotalCents / SHIPPING.freeAboveCents) * 100),
  )
  const qualifiesForFreeShipping = shippingCents === 0

  if (enriched.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <h1 className="mb-8 text-3xl font-bold tracking-tight">Warenkorb</h1>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
          <CartIcon
            className="mb-4 size-12 text-muted-foreground"
            aria-hidden
          />
          <h2 className="mb-2 text-lg font-semibold">
            Dein Warenkorb ist leer
          </h2>
          <p className="mb-6 max-w-sm text-pretty text-sm text-muted-foreground">
            Entdecke unsere handverlesenen Produkte und lege deine Favoriten in
            den Warenkorb.
          </p>
          <Link href="/" className="btn btn-primary btn-md">
            Weiter einkaufen
            <ArrowRightIcon className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 pb-28 md:py-12 lg:pb-12">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Warenkorb</h1>
      <CheckoutSteps current={0} />
      <CartUrgency itemCount={totalQuantity} />
      <p className="mb-8 text-muted-foreground">
        {totalQuantity} Artikel · {formatEuro(subtotalCents)}
      </p>

      <div className="grid gap-8 lg:grid-cols-3">
        <ul className="flex flex-col gap-4 lg:col-span-2">
          {enriched.map((item) => {
            const unitCents = toCents(item.product.price)
            return (
              <li
                key={item.id}
                className="flex gap-3 rounded-lg border border-border bg-card p-3 sm:gap-4 sm:p-4"
              >
                <Link
                  href={`/produkt/${item.product.id}`}
                  className="relative size-20 shrink-0 overflow-hidden rounded-md bg-muted sm:size-24"
                >
                  <Image
                    src={item.product.imageUrl}
                    alt={item.product.title}
                    fill
                    sizes="(min-width: 640px) 96px, 80px"
                    className="object-cover"
                  />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <Link
                        href={`/produkt/${item.product.id}`}
                        className="line-clamp-2 font-semibold hover:underline"
                      >
                        {item.product.title}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {formatEuro(unitCents)} / Stück
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold tabular-nums">
                      {formatEuro(unitCents * item.quantity)}
                    </p>
                  </div>
                  <CartItemControls
                    itemId={item.id}
                    quantity={item.quantity}
                    stock={item.product.stock}
                  />
                </div>
              </li>
            )
          })}
        </ul>

        <aside className="h-fit rounded-lg border border-border bg-card p-6 lg:sticky lg:top-20">
          <h2 className="mb-4 text-lg font-semibold">Zusammenfassung</h2>

          <div
            className={
              'mb-4 rounded-lg p-3 ' +
              (qualifiesForFreeShipping ? 'bg-success/10' : 'bg-accent/10')
            }
          >
            {qualifiesForFreeShipping ? (
              <p className="text-sm font-medium text-success">
                Du erhältst kostenlosen Versand!
              </p>
            ) : (
              <p className="text-sm">
                Noch{' '}
                <span className="font-semibold">
                  {formatEuro(missingForFreeCents)}
                </span>{' '}
                bis zum kostenlosen Versand.
              </p>
            )}
            <div
              role="progressbar"
              aria-valuenow={freeShippingProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Fortschritt Gratisversand"
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-background/50"
            >
              <div
                className={
                  'h-full transition-all ' +
                  (qualifiesForFreeShipping ? 'bg-success' : 'bg-accent')
                }
                style={{ width: `${freeShippingProgress}%` }}
              />
            </div>
          </div>

          <dl className="flex flex-col gap-2 border-b border-border pb-4 text-sm">
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
          <div className="flex justify-between py-4">
            <span className="font-semibold">Gesamt</span>
            <span className="text-lg font-bold tabular-nums">
              {formatEuro(grandTotalCents)}
            </span>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Alle Preise inkl. gesetzlicher MwSt. Lieferzeit:{' '}
            {SHIPPING.deliveryDaysMin}–{SHIPPING.deliveryDaysMax} Werktage.
          </p>
          <div className="hidden lg:block">
            <CheckoutButton />
            <div className="mt-3">
              <TrustBadges />
            </div>
          </div>
        </aside>
      </div>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md lg:hidden">
        <div className="container mx-auto flex items-center gap-4 px-4 py-3">
          <div className="flex min-w-0 flex-col">
            <span className="text-xs text-muted-foreground">
              Gesamt inkl. MwSt.
            </span>
            <span className="text-lg font-bold tabular-nums">
              {formatEuro(grandTotalCents)}
            </span>
          </div>
          <div className="flex-1">
            <CheckoutButton />
          </div>
        </div>
      </div>
      <RelatedProducts productId="" categoryId={null} />
    </div>
  )
}
