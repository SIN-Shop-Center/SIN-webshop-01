// Purpose: Homepage with featured products from Supabase (Step 2)
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)

import { getFeaturedProducts } from '@/lib/queries'
import { ProductCard } from '@/components/ProductCard'

// TODO(#26): Remove force-dynamic once data is stable enough for ISR.
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const featuredProducts = await getFeaturedProducts()

  return (
    <div className="container mx-auto px-4 py-12">
      <section className="mb-16 text-center">
        <h1 className="mb-4 text-4xl font-bold text-balance md:text-6xl">
          Premium Tech & Lifestyle
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground text-pretty">
          Entdecke handverlesene Produkte für deinen digitalen Alltag
        </p>
      </section>

      <section>
        <h2 className="mb-8 text-2xl font-bold">Featured Products</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  )
}
