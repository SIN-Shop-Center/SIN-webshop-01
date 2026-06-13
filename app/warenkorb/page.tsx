// Purpose: Cart page — mobile-first item layout, sticky mobile checkout bar,
// free-shipping progress, improved UX with CartSummary + CartItemRow
// Docs: PLAN-VERKAUFSFAEHIG.md

import Link from 'next/link'
import { getCartItems } from '@/lib/actions/cart'
import { getProductsByIds } from '@/lib/queries'
import { SHIPPING, getShippingCents } from '@/lib/shipping'
import { formatEuro, toCents } from '@/lib/format'
import { CartIcon, ArrowRightIcon } from '@/components/icons'
import { RelatedProducts } from '@/components/related-products'
import { CartUrgency } from '@/components/conversion/cart-urgency'
import { CheckoutButton } from '@/components/CheckoutButton'
import { CartSummary } from '@/components/cart/cart-summary'
import { CartItemRow } from '@/components/cart/cart-item-row'

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
      <CartUrgency itemCount={totalQuantity} />
      <p className="mb-8 text-muted-foreground">
        {totalQuantity} Artikel · {formatEuro(subtotalCents)}
      </p>

      <div className="grid gap-8 lg:grid-cols-3">
        <ul className="flex flex-col gap-4 lg:col-span-2">
          {enriched.map((item) => (
            <CartItemRow key={item.id} item={item} />
          ))}
        </ul>

        <CartSummary
          subtotalCents={subtotalCents}
          shippingCents={shippingCents}
          grandTotalCents={grandTotalCents}
          freeShippingProgress={freeShippingProgress}
          qualifiesForFreeShipping={qualifiesForFreeShipping}
          missingForFreeCents={missingForFreeCents}
        />
      </div>

      {/* ── Mobile sticky checkout bar ──────────────────────────────── */}
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
