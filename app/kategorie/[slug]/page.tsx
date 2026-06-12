import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getCategoryBySlug, getProductsPage, type SortOption } from '@/lib/supabase/queries'
import { ProductGrid } from '@/components/product-grid'
import { Pagination } from '@/components/pagination'
import { SortSelect } from '@/components/sort-select'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ seite?: string; sortierung?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)
  return {
    title: category ? `${category.name} | ShopSIN` : 'Kategorie | ShopSIN',
  }
}

export default async function KategoriePage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const sp = await searchParams
  const category = await getCategoryBySlug(slug)
  if (!category) notFound()

  const page = Math.max(1, Number(sp.seite) || 1)
  const sort = (sp.sortierung as SortOption) ?? 'neueste'
  const { products, total } = await getProductsPage({ page, sort, categoryId: category.id })

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="pb-4 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Start</Link>
        {' / '}
        <Link href="/produkte" className="hover:text-foreground">Produkte</Link>
        {' / '}
        <span className="text-foreground">{category.name}</span>
      </nav>

      <div className="flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground text-balance">{category.name}</h1>
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
        basePath={`/kategorie/${slug}`}
        searchParams={{ sortierung: sort }}
      />
    </main>
  )
}
