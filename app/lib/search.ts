// Purpose: Produkt-Suche mit Postgres FTS + Filtern (Issue #49)
// Docs: scripts/supabase/setup-search.sql
//
// websearch_to_tsquery akzeptiert Google-ähnliche Syntax:
//   "rotes t-shirt"   (exact phrase)
//   tshirt OR hemd
//   -baumwolle
//
// Schema-Realität: Produkte haben `name` + `description` (nicht `title`).
// Kategorie liegt in `metadata->category_id` (JSONB), daher
// Filter über contains-Operator statt .eq().
//
// Sortierung: 'relevance' (ts_rank) als Default, alternativ Preis/Neuste.

import { createDataClient } from '@/app/lib/supabase/data-client'

export type SearchFilters = {
  category?: string
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
}

export type SearchSort = 'relevance' | 'price-asc' | 'price-desc' | 'newest'

export type SearchResult = {
  products: Array<{
    id: string
    name: string
    description: string | null
    price: number
    images: string[] | null
    slug: string
    stock: number
  }>
  total: number
  page: number
  pageSize: number
}

const PAGE_SIZE = 24

export async function searchProducts(
  query: string,
  filters: SearchFilters = {},
  sort: SearchSort = 'relevance',
  page = 1,
): Promise<SearchResult> {
  const supabase = createDataClient()
  // Selektives Select — `*` wäre zu breit
  let q = supabase
    .from('products')
    .select('id, name, slug, description, price, images, stock', {
      count: 'exact',
    })
    .eq('is_active', true)

  if (query.trim()) {
    q = q.textSearch('search_vector', query, {
      config: 'german',
      type: 'websearch',
    })
  }
  if (filters.category) {
    // metadata->>category_id matcht wenn gesetzt; alternativ Fallback
    // auf category_name in metadata für anzeige-Filter.
    q = q.contains('metadata', { category_id: filters.category })
  }
  if (filters.minPrice != null) q = q.gte('price', filters.minPrice)
  if (filters.maxPrice != null) q = q.lte('price', filters.maxPrice)
  if (filters.inStock) q = q.gt('stock', 0)

  if (sort === 'price-asc') q = q.order('price', { ascending: true })
  else if (sort === 'price-desc') q = q.order('price', { ascending: false })
  else if (sort === 'newest') q = q.order('created_at', { ascending: false })
  // 'relevance' übernimmt die ts_rank-Reihenfolge aus textSearch

  const from = (page - 1) * PAGE_SIZE
  const { data, count, error } = await q.range(from, from + PAGE_SIZE - 1)
  if (error) throw error

  return {
    products: (data ?? []) as SearchResult['products'],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  }
}
