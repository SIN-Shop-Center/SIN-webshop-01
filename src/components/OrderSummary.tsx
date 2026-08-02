import Image from 'next/image'
import type { CartItem } from '@/lib/cart-types'
import type { Product } from '@/lib/data'
import { SHIPPING } from '@/lib/shipping-constants'
import { formatEuro } from '@/lib/format'


export function OrderSummary({
  cart,
  products,
}: {
  cart: CartItem[]
  products: Product[]
}) {
  const productsById = new Map(products.map((product) => [product.id, product]))
  const lines = cart.flatMap((item) => {
    const product = productsById.get(item.product_id)
    if (!product) return []
    const quantity = Math.max(1, Number((item as { quantity?: number }).quantity ?? 1))
    return [{ item, product, quantity, lineTotal: product.price * quantity }]
  })

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0)
  const subtotalCents = Math.round(subtotal * 100)
  const shippingCents = subtotalCents >= SHIPPING.freeAboveCents ? 0 : SHIPPING.standardCents
  const totalCents = subtotalCents + shippingCents

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4 sm:px-6">
        <h2 className="font-semibold tracking-tight">Bestellübersicht</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {lines.length} {lines.length === 1 ? 'Position' : 'Positionen'}
        </p>
      </div>

      <div className="divide-y divide-border">
        {lines.map(({ item, product, quantity, lineTotal }) => {
          const overStock = quantity > product.stock
          const variantKey = [
            (item as { size?: string }).size,
            (item as { color?: string }).color,
            item.variant_id,
          ].filter(Boolean).join(' · ')

          return (
            <div key={`${product.id}:${variantKey || 'default'}`} className="flex gap-4 px-5 py-4 sm:px-6">
              <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-border bg-muted/30">
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-medium leading-5">{product.title}</p>
                    {variantKey ? (
                      <p className="mt-1 text-xs text-muted-foreground">{variantKey}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {quantity} × {formatEuro(Math.round(product.price * 100))}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatEuro(Math.round(lineTotal * 100))}
                  </p>
                </div>
                {overStock ? (
                  <p className="mt-2 text-xs font-medium text-destructive">
                    Gewünschte Menge übersteigt den aktuellen Bestand von {product.stock}.
                  </p>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      <dl className="space-y-3 border-t border-border px-5 py-5 text-sm sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Zwischensumme</dt>
          <dd className="font-medium tabular-nums">{formatEuro(subtotalCents)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Versand</dt>
          <dd className="font-medium tabular-nums">
            {shippingCents === 0 ? 'Kostenlos' : formatEuro(shippingCents)}
          </dd>
        </div>
        <div className="flex items-end justify-between gap-4 border-t border-border pt-4">
          <dt>
            <span className="block font-semibold">Gesamtsumme</span>
            <span className="mt-1 block text-xs text-muted-foreground">Versandkosten enthalten</span>
          </dt>
          <dd className="text-xl font-semibold tracking-tight tabular-nums">{formatEuro(totalCents)}</dd>
        </div>
      </dl>
    </section>
  )
}
