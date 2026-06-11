// Purpose: Product detail page route (Step 2 of migration, DB-backed)
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)

import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getProductById, getAllProductIdsForBuild } from '@/lib/queries'
import { AddToCartButton } from '@/components/AddToCartButton'
import { PriceTag } from '@/components/PriceTag'

// ISR: revalidate every 5 minutes (product details change rarely)
export const revalidate = 300
export const dynamicParams = true // render unknown IDs on-demand

// Pre-render known product IDs at build time (uses admin client — no cookies)
// Disabled: build env cannot reach the private Supabase IP (92.5.60.87:8006)
// from the build container. Pages render on-demand via dynamicParams.
// export async function generateStaticParams() {
//   const ids = await getAllProductIdsForBuild()
//   return ids.map((id) => ({ id }))
// }

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

          <div className="mb-6">
            <PriceTag
              priceCents={Math.round(Number(product.price) * 100)}
              originalPriceCents={
                product.originalPrice != null
                  ? Math.round(Number(product.originalPrice) * 100)
                  : null
              }
              size="lg"
            />
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
