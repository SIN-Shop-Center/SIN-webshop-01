import type { ProductQuery } from './client-types'

export function buildCatalogQuery(params: ProductQuery) {
  const query = new URLSearchParams()
  if (params.search) {
    query.set('search', params.search)
  }
  if (params.category) {
    query.set('category', params.category)
  }
  if (params.page) {
    query.set('page', String(params.page))
  }
  if (params.limit) {
    query.set('limit', String(params.limit))
  }
  return query.toString()
}
