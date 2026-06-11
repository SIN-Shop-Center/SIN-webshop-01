// Purpose: Warenkorb page — real cart via Server Actions (Step 3)
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)

import Link from 'next/link'
import Image from 'next/image'
import { getCartItems } from '@/lib/actions/cart'
import { getProductById } from '@/lib/queries'
import { CartItemControls } from '@/components/CartItemControls'
import { CheckoutButton } from '@/components/CheckoutButton'

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
          <div className="mb-4 flex justify-between border-b border-border pb-4">
            <span className="text-muted-foreground">Zwischensumme</span>
            <span className="font-semibold">{total.toFixed(2)} €</span>
          </div>
          <CheckoutButton />
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Sichere Zahlung über Stripe
          </p>
        </div>
      </div>
    </div>
  )
}
