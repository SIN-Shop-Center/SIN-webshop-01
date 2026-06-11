// Purpose: Search/Filter-UI mit URL-State (Issue #49)
// Docs: app/lib/search.ts
//
// URL-State-Design: /suche?q=...&kategorie=...&min=...&max=...&verfuegbar=1&sortierung=...&seite=...
// — teilbar, bookmark-bar, browser-back funktioniert.

import Link from 'next/link'
import { searchProducts, type SearchSort } from '@/app/lib/search'
import { SearchFilters } from './search-filters'

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
          <SearchFilters />
        </aside>

        <div className="flex-1">
          {products.length === 0 ? (
            <p className="text-muted-foreground">
              Versuche einen anderen Suchbegriff oder entferne Filter.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {products.map((p, i) => (
                <li key={p.id}>
                  <Link
                    href={`/produkt/${p.slug}`}
                    className="group flex flex-col gap-3 rounded-lg border border-border p-3 transition-colors hover:border-foreground/30"
                  >
                    <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
                      {p.images?.[0] ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={p.images[0]}
                          alt={p.name}
                          loading={i < 3 ? 'eager' : 'lazy'}
                          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : null}
                      {p.stock === 0 && (
                        <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2 py-1 text-xs font-medium">
                          Ausverkauft
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <h3 className="line-clamp-2 text-sm font-medium text-pretty">
                        {p.name}
                      </h3>
                      <span className="text-sm font-semibold">
                        {Number(p.price).toFixed(2).replace('.', ',')} €
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {totalPages > 1 && (
            <nav
              aria-label="Seitennavigation"
              className="mt-8 flex justify-center gap-2"
            >
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => {
                const params = new URLSearchParams(
                  Object.entries(sp).filter(
                    ([, v]) => v != null && v !== '',
                  ) as [string, string][],
                )
                params.set('seite', String(n))
                return (
                  <Link
                    key={n}
                    href={`/suche?${params}`}
                    aria-current={n === page ? 'page' : undefined}
                    className={`rounded-md px-3 py-1.5 text-sm ${
                      n === page
                        ? 'bg-foreground text-background'
                        : 'border border-border hover:bg-muted'
                    }`}
                  >
                    {n}
                  </Link>
                )
              })}
            </nav>
          )}
        </div>
      </div>
    </main>
  )
}