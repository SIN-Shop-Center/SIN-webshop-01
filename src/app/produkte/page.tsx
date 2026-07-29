// Purpose: Product listing page with filters, sidebar, and pagination
// Docs: page.doc.md

import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getProductsPage, getCategories, type SortOption } from '@/lib/supabase/queries'
import { ProductGrid } from '@/components/product-grid'
import { Pagination } from '@/components/pagination'
import { SortSelect } from '@/components/sort-select'
import { FilterSidebar } from '@/components/filter-sidebar'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://shopsin.delqhi.com'

export const metadata: Metadata = {
  title: 'Alle Produkte | ShopSIN',
  description: 'Entdecke unser gesamtes Sortiment bei ShopSIN — Mode, Wohnen, Elektronik und mehr.',
  openGraph: {
    title: 'Alle Produkte | ShopSIN',
    description: 'Entdecke unser gesamtes Sortiment bei ShopSIN — Mode, Wohnen, Elektronik und mehr.',
    url: `${APP_URL}/produkte`,
    type: 'website',
    siteName: 'ShopSIN',
    locale: 'de_DE',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Alle Produkte | ShopSIN',
    description: 'Entdecke unser gesamtes Sortiment bei ShopSIN — Mode, Wohnen, Elektronik und mehr.',
  },
  alternates: {
    canonical: `${APP_URL}/produkte`,
  },
}

interface PageProps {
  searchParams: Promise<{ seite?: string; sortierung?: string; kategorie?: string; preis_max?: string }>
}

export default async function ProduktePage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Math.max(1, Number(params.seite) || 1)
  const sort = (params.sortierung as SortOption) ?? 'neueste'
  const categories = await getCategories()

  const { products, total } = await getProductsPage({
    page,
    sort,
    categoryId: params.kategorie,
    maxPrice: params.preis_max ? Number(params.preis_max) : undefined,
  })

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

      <div className="flex flex-col gap-8 md:flex-row">
        <div className="hidden md:block">
          <FilterSidebar
            categories={categories}
            activeCategory={params.kategorie}
          />
        </div>
        <div className="flex-1">
          <ProductGrid products={products} />
          <Pagination
            currentPage={page}
            total={total}
            basePath="/produkte"
            searchParams={{ sortierung: sort, kategorie: params.kategorie ?? '', preis_max: params.preis_max ?? '' }}
          />
        </div>
      </div>

      {/* Mobile filter button */}
      <details className="mt-4 md:hidden">
        <summary className="cursor-pointer rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
          Filter
        </summary>
        <div className="pt-4">
          <FilterSidebar
            categories={categories}
            activeCategory={params.kategorie}
          />
        </div>
      </details>
    </main>
  )
}
