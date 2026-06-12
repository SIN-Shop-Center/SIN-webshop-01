import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getProductsPage, type SortOption } from '@/lib/supabase/queries'
import { ProductGrid } from '@/components/product-grid'
import { Pagination } from '@/components/pagination'
import { SortSelect } from '@/components/sort-select'

export const metadata: Metadata = {
  title: 'Alle Produkte | ShopSIN',
  description: 'Entdecke unser gesamtes Sortiment bei ShopSIN.',
}

interface PageProps {
  searchParams: Promise<{ seite?: string; sortierung?: string }>
}

export default async function ProduktePage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Math.max(1, Number(params.seite) || 1)
  const sort = (params.sortierung as SortOption) ?? 'neueste'

  const { products, total } = await getProductsPage({ page, sort })

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground text-balance">Alle Produkte</h1>
          <p className="pt-1 text-sm text-muted-foreground">{total} Artikel</p>
        </div>
        <Suspense>
          <SortSelect />
        </Suspense>
      </div>

      <ProductGrid products={products} />

      <Pagination
        currentPage={page}
        total={total}
        basePath="/produkte"
        searchParams={{ sortierung: sort }}
      />
    </main>
  )
}
