// Purpose: Homepage with featured products from Supabase (Step 2)
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)

import { getFeaturedProducts } from '@/lib/queries'
import { ProductCard } from '@/components/ProductCard'

// ISR: revalidate every 60 seconds (featured products may change)
export const revalidate = 60

export default async function HomePage() {
  // Graceful fallback if Supabase is unavailable (e.g. during build/CI without secrets)
  let featuredProducts: Awaited<ReturnType<typeof getFeaturedProducts>> = []
  try {
    featuredProducts = await getFeaturedProducts()
  } catch {
    featuredProducts = []
  }

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
        {featuredProducts.length === 0 ? (
          <div className="rounded-lg border border-border bg-muted p-8 text-center text-muted-foreground">
            <p>Produkte werden geladen… (Supabase nicht erreichbar)</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
