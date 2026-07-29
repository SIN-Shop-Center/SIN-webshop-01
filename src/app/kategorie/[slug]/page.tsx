import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getCategoryBySlug, getProductsPage, getCategories, type SortOption } from '@/lib/supabase/queries'
import { ProductGrid } from '@/components/product-grid'
import { Pagination } from '@/components/pagination'
import { SortSelect } from '@/components/sort-select'
import { FilterSidebar } from '@/components/filter-sidebar'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ seite?: string; sortierung?: string; preis_max?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)
  return {
    title: category ? `${category.name} | ShopSIN` : 'Kategorie | ShopSIN',
    description: category ? `Entdecke ${category.name} bei ShopSIN — handverlesene Produkte mit kostenlosem Versand ab 49 €.` : undefined,
  }
}

export default async function KategoriePage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const sp = await searchParams
  const category = await getCategoryBySlug(slug)
  if (!category) notFound()

  const page = Math.max(1, Number(sp.seite) || 1)
  const sort = (sp.sortierung as SortOption) ?? 'neueste'
  const categories = await getCategories()
  const { products, total } = await getProductsPage({
    page,
    sort,
    categoryId: category.id,
    maxPrice: sp.preis_max ? Number(sp.preis_max) : undefined,
  })

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="pb-6 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Start</Link>
        {' / '}
        <Link href="/produkte" className="hover:text-foreground">Produkte</Link>
        {' / '}
        <span className="text-foreground">{category.name}</span>
      </nav>

      <div className="flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground text-balance">{category.name}</h1>
          <p className="pt-2 text-base text-muted-foreground">{total} Artikel</p>
        </div>
        <Suspense>
          <SortSelect />
        </Suspense>
      </div>

      <div className="flex flex-col gap-8 md:flex-row">
        <div className="hidden md:block">
          <FilterSidebar
            categories={categories}
            activeCategory={slug}
          />
        </div>
        <div className="flex-1">
          <ProductGrid products={products} />
          <Pagination
            currentPage={page}
            total={total}
            basePath={`/kategorie/${slug}`}
            searchParams={{ sortierung: sort, preis_max: sp.preis_max ?? '' }}
          />
        </div>
      </div>

      {/* Mobile filter button */}
      <details className="mt-4 md:hidden">
        <summary className="cursor-pointer rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted">
          Filter
        </summary>
        <div className="pt-4">
          <FilterSidebar
            categories={categories}
            activeCategory={slug}
          />
        </div>
      </details>
    </main>
  )
}
