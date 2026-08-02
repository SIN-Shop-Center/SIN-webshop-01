// Purpose: Public-read queries for listing, categories, pagination
// Docs: AGENTS.md
// Uses data-client (NOT SSR) — works in Cloudflare Workers.

import { createDataClient } from '@/lib/supabase/data-client'
import type { Product } from '@/lib/data'
import { transformProduct } from '@/lib/product-query-mapper'

// ── Types ────────────────────────────────────────────────────────────────

export type SortOption = 'neueste' | 'preis-auf' | 'preis-ab' | 'name'

export const PAGE_SIZE = 24

function applySorting(query: any, sort: SortOption) {
  switch (sort) {
    case 'preis-auf':
      return query.order('price', { ascending: true })
    case 'preis-ab':
      return query.order('price', { ascending: false })
    case 'name':
      return query.order('title', { ascending: true })
    default:
      return query.order('created_at', { ascending: false })
  }
}

export async function getProductsPage(opts: {
  page?: number
  sort?: SortOption
  categoryId?: string
  search?: string
  maxPrice?: number
}): Promise<{ products: Product[]; total: number }> {
  const { page = 1, sort = 'neueste', categoryId, search, maxPrice } = opts
  const supabase = createDataClient()
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let builder = supabase
    .from('products_v')
    .select('*', { count: 'exact' })
    .eq('is_active', true)

  if (categoryId) builder = builder.eq('category_id', categoryId)
  if (search) builder = builder.or(`title.ilike.%${search}%,title_de.ilike.%${search}%`)
  if (maxPrice != null) builder = builder.lte('price', maxPrice)

  builder = applySorting(builder, sort).range(from, to)

  const { data, count, error } = await builder
  if (error) {
    console.error('getProductsPage error:', error.message)
    return { products: [], total: 0 }
  }
  return {
    products: (data ?? [])
      .filter((row): row is typeof row & { id: string } => Boolean(row.id))
      .map(transformProduct),
    total: count ?? 0,
  }
}

export interface Category {
  id: string
  name: string
  slug: string
}

export async function getCategories(): Promise<Category[]> {
  const supabase = createDataClient()
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name', { ascending: true })

  if (error) {
    console.error('getCategories error:', error.message)
    return []
  }
  return ((data ?? []) as Category[]).map((c) => ({
    ...c,
    name: c.name ?? c.name,
  }))
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = createDataClient()
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('slug', slug)
    .maybeSingle()

  if (error || !data) return null
  return data as Category
}

export async function getRelatedProducts(
  productId: string,
  categoryId: string | null,
  limit = 4,
): Promise<Product[]> {
  const supabase = createDataClient()

  // 1. Zuerst Produkte aus derselben Kategorie
  let query = supabase
    .from('products_v')
    .select('*')
    .eq('is_active', true)
    .neq('id', productId)
    .limit(limit)

  if (categoryId) query = query.eq('category_id', categoryId)

  const { data, error } = await query
  if (error) return []

  const related = (data ?? [])
    .filter((row): row is typeof row & { id: string } => Boolean(row.id))
    .map(transformProduct)

  // 2. FIX: Zu wenig Treffer in der Kategorie? → mit beliebten Produkten
  //    aus dem Gesamtsortiment auffüllen, damit immer `limit` Karten stehen.
  if (related.length < limit) {
    const excludeIds = [productId, ...related.map((p) => p.id)]
    const { data: fill, error: fillError } = await supabase
      .from('products_v')
      .select('*')
      .eq('is_active', true)
      .not('id', 'in', `(${excludeIds.map((id) => `"${id}"`).join(',')})`)
      .order('rating_count', { ascending: false })
      .limit(limit - related.length)

    if (!fillError && fill) {
      related.push(...fill
        .filter((row): row is typeof row & { id: string } => Boolean(row.id))
        .map(transformProduct))
    }
  }

  return related
}
