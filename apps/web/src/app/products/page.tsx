import { Suspense } from 'react'
import { ProductsPageClient } from './ProductsPageClient'
import { getInitialCatalogCategories, getInitialCatalogProducts } from '@/lib/server/catalog-list'

function ProductsPageFallback() {
  return (
    <main className="shell-container py-10">
      <h1 className="sr-only">Produktkatalog</h1>
      <div className="h-[32rem] animate-pulse rounded-[2rem] bg-brand-surface" />
    </main>
  )
}

export default async function ProductsPage() {
  const [initialProducts, initialCategories] = await Promise.all([
    getInitialCatalogProducts(120),
    getInitialCatalogCategories(),
  ])

  return (
    <Suspense fallback={<ProductsPageFallback />}>
      <ProductsPageClient initialProducts={initialProducts} initialCategories={initialCategories} />
    </Suspense>
  )
}
