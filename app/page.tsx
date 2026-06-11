// Purpose: Homepage with featured products (Step 1)
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)

import { INITIAL_PRODUCTS } from './lib/data'
import { ProductCard } from './components/ProductCard'

export default function HomePage() {
  const featuredProducts = INITIAL_PRODUCTS.filter((p) => p.isFeatured)

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
