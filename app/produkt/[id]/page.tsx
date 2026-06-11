// Purpose: Product detail page route (Step 2 of migration, DB-backed)
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)

import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getProductById } from '@/lib/queries'
import { AddToCartButton } from '@/components/AddToCartButton'

// TODO(#26): Remove force-dynamic once data is stable enough for ISR.
export const dynamic = 'force-dynamic'

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const product = await getProductById(id)

  if (!product) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
          <Image
            src={product.imageUrl}
            alt={product.title}
            fill
            className="object-cover"
            priority
          />
        </div>

        <div>
          <h1 className="mb-4 text-3xl font-bold text-balance">{product.title}</h1>
          <p className="mb-6 text-muted-foreground text-pretty">{product.description}</p>

          <div className="mb-6 flex items-center gap-4">
            <span className="text-3xl font-bold">{product.price.toFixed(2)} €</span>
            {product.originalPrice && (
              <span className="text-xl text-muted-foreground line-through">
                {product.originalPrice.toFixed(2)} €
              </span>
            )}
          </div>

          {product.features && product.features.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-2 font-semibold">Features</h3>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                {product.features.map((feature, i) => (
                  <li key={i}>{feature}</li>
                ))}
              </ul>
            </div>
          )}

          <AddToCartButton productId={product.id} stock={product.stock} />

          <p className="mt-4 text-sm text-muted-foreground">
            Lagerbestand: {product.stock} verfügbar
          </p>
        </div>
      </div>
    </div>
  )
}
