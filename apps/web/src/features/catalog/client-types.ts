import type { Category, Product } from '@/types'

export type ProductQuery = {
  search?: string
  category?: string
  page?: number
  limit?: number
}

export type CacheEntry<T> = {
  value: T
  expiresAt: number
}

export type CacheNamespace = 'catalog-products-list' | 'catalog-product-detail' | 'catalog-categories'

export type StorageReadOptions = {
  allowExpired?: boolean
}

export type CatalogCaches = {
  productListCache: Map<string, CacheEntry<Product[]>>
  productDetailCache: Map<string, CacheEntry<Product | null>>
  categoriesCache: Map<string, CacheEntry<Category[]>>
}

export type CatalogInFlight = {
  productListInFlight: Map<string, Promise<Product[]>>
  productDetailInFlight: Map<string, Promise<Product | null>>
  categoriesInFlight: Map<string, Promise<Category[]>>
}
