// Purpose: Search/Filter-UI mit URL-State (Issue #49)
// Docs: app/lib/search.ts
//
// URL-State-Design: /suche?q=...&kategorie=...&min=...&max=...&verfuegbar=1&sortierung=...&seite=...
// — teilbar, bookmark-bar, browser-back funktioniert.

import { searchProducts, type SearchSort } from '@/app/lib/search'
import { getCategories } from '@/lib/supabase/queries'
import { SearchFilters } from './search-filters'
import { ProductGrid } from '@/components/product-grid'
import { Pagination } from '@/components/pagination'

export const dynamic = 'force-dynamic'

interface SearchParams {
  q?: string
  kategorie?: string
  min?: string
  max?: string
  verfuegbar?: string
  sortierung?: string
  seite?: string
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const query = sp.q ?? ''
  const page = Math.max(1, Number(sp.seite ?? '1'))
  const allCategories = await getCategories()

  const { products, total, pageSize } = await searchProducts(
    query,
    {
      category: sp.kategorie,
      minPrice: sp.min ? Number(sp.min) : undefined,
      maxPrice: sp.max ? Number(sp.max) : undefined,
      inStock: sp.verfuegbar === '1',
    },
    (sp.sortierung as SearchSort) ?? 'relevance',
    page,
  ).catch(() => ({ products: [], total: 0, pageSize: 24 }))

  const totalPages = Math.ceil(total / pageSize)

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-semibold text-balance">
        {query
          ? `Suchergebnisse für „${query}"`
          : 'Alle Produkte'}
      </h1>
      <p
        className="mb-6 text-sm text-muted-foreground"
        role="status"
      >
        {total === 0
          ? 'Keine Ergebnisse'
          : `${total} ${total === 1 ? 'Ergebnis' : 'Ergebnisse'}`}
      </p>

      <div className="flex flex-col gap-8 md:flex-row">
        <aside className="md:w-56 md:shrink-0">
          <SearchFilters categories={allCategories} />
        </aside>

        <div className="flex-1">
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
              <p className="text-lg font-medium text-foreground">Keine Produkte gefunden</p>
              <p className="text-sm text-muted-foreground">
                Versuche einen anderen Suchbegriff oder entferne Filter.
              </p>
            </div>
          ) : (
            <ProductGrid products={products.map(p => ({
              id: p.id,
              title: p.title,
              description: '',
              price: Number(p.price),
              rating: 0,
              ratingCount: 0,
              category: '',
              imageUrl: p.image_gallery?.[0] || '',
              imageGallery: p.image_gallery || [],
              stock: p.stock,
            }))} />
          )}

          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              total={total}
              basePath="/suche"
              searchParams={Object.fromEntries(
                Object.entries(sp).filter(([, v]) => v != null && v !== '')
              )}
            />
          )}
        </div>
      </div>
    </main>
  )
}