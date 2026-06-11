// Purpose: Warenkorb page — real cart via Server Actions (Step 3 + Step 9 shipping)
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)

import Link from 'next/link'
import Image from 'next/image'
import { getCartItems } from '@/lib/actions/cart'
import { getProductById } from '@/lib/queries'
import { CartItemControls } from '@/components/CartItemControls'
import { CheckoutButton } from '@/components/CheckoutButton'
import { SHIPPING, getShippingCents } from '@/lib/shipping'

export const dynamic = 'force-dynamic'

export default async function CartPage() {
  const items = await getCartItems()

  const enriched = (
    await Promise.all(
      items.map(async (item) => {
        const product = await getProductById(item.product_id)
        return product ? { ...item, product } : null
      }),
    )
  ).filter((x): x is NonNullable<typeof x> => x !== null)

  const total = enriched.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0,
  )
  const subtotalCents = Math.round(total * 100)
  const shippingCents = getShippingCents(subtotalCents)
  const grandTotalCents = subtotalCents + shippingCents
  const missingForFreeCents = SHIPPING.freeAboveCents - subtotalCents

  if (enriched.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12">
        <h1 className="mb-8 text-3xl font-bold">Warenkorb</h1>
        <div className="rounded-lg border border-border bg-muted p-8 text-center">
          <p className="mb-4 text-muted-foreground">Dein Warenkorb ist leer.</p>
          <Link href="/" className="font-medium text-primary underline">
            Weiter einkaufen
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">Warenkorb</h1>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          {enriched.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 rounded-lg border border-border p-4"
            >
              <div className="relative size-24 shrink-0 overflow-hidden rounded-md bg-muted">
                <Image
                  src={item.product.imageUrl}
                  alt={item.product.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <Link
                    href={`/produkt/${item.product.id}`}
                    className="font-semibold hover:underline"
                  >
                    {item.product.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {Number(item.product.price).toFixed(2)} € / Stück
                  </p>
                </div>
                <CartItemControls itemId={item.id} quantity={item.quantity} />
              </div>
              <div className="text-right font-semibold">
                {(Number(item.product.price) * item.quantity).toFixed(2)} €
              </div>
            </div>
          ))}
        </div>

        <div className="h-fit rounded-lg border border-border p-6">
          <h2 className="mb-4 text-lg font-semibold">Zusammenfassung</h2>
          <div className="flex flex-col gap-2 border-b border-border pb-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Zwischensumme</span>
              <span>{(subtotalCents / 100).toFixed(2)} €</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Versand</span>
              <span>
                {shippingCents === 0
                  ? 'Kostenlos'
                  : `${(shippingCents / 100).toFixed(2)} €`}
              </span>
            </div>
          </div>
          <div className="flex justify-between py-4">
            <span className="font-semibold">Gesamt</span>
            <span className="text-lg font-bold">
              {(grandTotalCents / 100).toFixed(2)} €
            </span>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Alle Preise inkl. MwSt. Lieferzeit:{' '}
            {SHIPPING.deliveryDaysMin}-{SHIPPING.deliveryDaysMax} Werktage.
          </p>
          {missingForFreeCents > 0 && (
            <p className="mb-4 rounded-lg bg-muted p-3 text-xs">
              Noch {(missingForFreeCents / 100).toFixed(2)} € bis zum kostenlosen
              Versand.
            </p>
          )}
          <CheckoutButton />
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Sichere Zahlung über Stripe
          </p>
        </div>
      </div>
    </div>
  )
}
