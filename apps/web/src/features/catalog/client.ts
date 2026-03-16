import { CatalogCategoryListSchema, CatalogProductListSchema, CatalogProductSchema } from '@simone/contracts'
import { sampleProducts } from '@/data/sample-products'
import type { Category, Product } from '@/types'
import {
  CATEGORIES_TTL_MS,
  PRODUCT_DETAIL_TTL_MS,
  PRODUCTS_TTL_MS,
  STALE_REUSE_TTL_MS,
} from './client-constants'
import { readCache, readCacheEntry, readStaleCacheEntry, writeCache, catalogCaches, catalogInFlight } from './client-cache'
import { allowCatalogSampleFallback } from './client-fallback'
import { fetchWithTimeout } from './client-fetch'
import { normalizeLegacySampleProduct, normalizeSampleCategories, normalizeSampleProducts, toUICategory, toUIProduct } from './client-normalizers'
import { buildCatalogQuery } from './client-query'
import type { ProductQuery } from './client-types'

const {
  productListCache,
  productDetailCache,
  categoriesCache,
} = catalogCaches

const {
  productListInFlight,
  productDetailInFlight,
  categoriesInFlight,
} = catalogInFlight

export async function loadCatalogProducts(params: ProductQuery = {}): Promise<Product[]> {
  const query = buildCatalogQuery(params)
  const url = query ? `/api/products?${query}` : '/api/products'
  const cacheKey = query || '__all__'

  const cached = readCache(productListCache, cacheKey, 'catalog-products-list')
  if (cached) {
    return cached
  }

  const existingRequest = productListInFlight.get(cacheKey)
  if (existingRequest) {
    return existingRequest
  }

  const request = (async () => {
    try {
      const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: { accept: 'application/json' },
      })

      if (!response.ok) {
        throw new Error(`catalog products request failed (${response.status})`)
      }

      const payload = CatalogProductListSchema.parse(await response.json())
      if (payload.items.length === 0 && allowCatalogSampleFallback()) {
        return writeCache(
          productListCache,
          cacheKey,
          normalizeSampleProducts(sampleProducts),
          PRODUCTS_TTL_MS,
          'catalog-products-list',
        )
      }

      return writeCache(
        productListCache,
        cacheKey,
        payload.items.map(toUIProduct),
        PRODUCTS_TTL_MS,
        'catalog-products-list',
      )
    } catch (error) {
      const stale = readStaleCacheEntry(productListCache, cacheKey, 'catalog-products-list')
      if (stale) {
        return writeCache(productListCache, cacheKey, stale.value, STALE_REUSE_TTL_MS, 'catalog-products-list')
      }

      if (!allowCatalogSampleFallback()) {
        console.error('catalog_products_fetch_failed_no_fallback', error)
        return writeCache(productListCache, cacheKey, [], 15_000, 'catalog-products-list')
      }

      return writeCache(
        productListCache,
        cacheKey,
        normalizeSampleProducts(sampleProducts),
        PRODUCTS_TTL_MS,
        'catalog-products-list',
      )
    }
  })()

  productListInFlight.set(cacheKey, request)
  try {
    return await request
  } finally {
    productListInFlight.delete(cacheKey)
  }
}

export async function loadCatalogProductById(id: string): Promise<Product | null> {
  const detailCached = readCacheEntry(productDetailCache, id, 'catalog-product-detail')
  if (detailCached) {
    return detailCached.value
  }

  const existingRequest = productDetailInFlight.get(id)
  if (existingRequest) {
    return existingRequest
  }

  const request = (async () => {
    try {
      const response = await fetchWithTimeout(`/api/products/${id}`, {
        method: 'GET',
        headers: { accept: 'application/json' },
      })

      if (!response.ok) {
        if (response.status === 404) {
          return writeCache(productDetailCache, id, null, PRODUCT_DETAIL_TTL_MS, 'catalog-product-detail')
        }
        throw new Error(`catalog product request failed (${response.status})`)
      }

      const payload = CatalogProductSchema.parse(await response.json())
      return writeCache(productDetailCache, id, toUIProduct(payload), PRODUCT_DETAIL_TTL_MS, 'catalog-product-detail')
    } catch (error) {
      const stale = readStaleCacheEntry(productDetailCache, id, 'catalog-product-detail')
      if (stale) {
        return writeCache(productDetailCache, id, stale.value, STALE_REUSE_TTL_MS, 'catalog-product-detail')
      }

      if (!allowCatalogSampleFallback()) {
        console.error('catalog_product_fetch_failed_no_fallback', error)
        return writeCache(productDetailCache, id, null, 15_000, 'catalog-product-detail')
      }

      const fallback = sampleProducts.find((product) => product.id === id)
      return writeCache(
        productDetailCache,
        id,
        fallback ? normalizeLegacySampleProduct(fallback) : null,
        PRODUCT_DETAIL_TTL_MS,
        'catalog-product-detail',
      )
    }
  })()

  productDetailInFlight.set(id, request)
  try {
    return await request
  } finally {
    productDetailInFlight.delete(id)
  }
}

export async function loadCatalogCategories(): Promise<Category[]> {
  const cacheKey = '__all__'
  const cached = readCache(categoriesCache, cacheKey, 'catalog-categories')
  if (cached) {
    return cached
  }

  const existingRequest = categoriesInFlight.get(cacheKey)
  if (existingRequest) {
    return existingRequest
  }

  const request = (async () => {
    try {
      const response = await fetchWithTimeout('/api/categories', {
        method: 'GET',
        headers: { accept: 'application/json' },
      })

      if (!response.ok) {
        throw new Error(`catalog categories request failed (${response.status})`)
      }

      const payload = CatalogCategoryListSchema.parse(await response.json())
      if (payload.items.length === 0 && allowCatalogSampleFallback()) {
        return writeCache(categoriesCache, cacheKey, normalizeSampleCategories(), CATEGORIES_TTL_MS, 'catalog-categories')
      }

      return writeCache(
        categoriesCache,
        cacheKey,
        payload.items.map(toUICategory),
        CATEGORIES_TTL_MS,
        'catalog-categories',
      )
    } catch (error) {
      const stale = readStaleCacheEntry(categoriesCache, cacheKey, 'catalog-categories')
      if (stale) {
        return writeCache(categoriesCache, cacheKey, stale.value, STALE_REUSE_TTL_MS, 'catalog-categories')
      }

      if (!allowCatalogSampleFallback()) {
        console.error('catalog_categories_fetch_failed_no_fallback', error)
        return writeCache(categoriesCache, cacheKey, [], 15_000, 'catalog-categories')
      }

      return writeCache(categoriesCache, cacheKey, normalizeSampleCategories(), CATEGORIES_TTL_MS, 'catalog-categories')
    }
  })()

  categoriesInFlight.set(cacheKey, request)
  try {
    return await request
  } finally {
    categoriesInFlight.delete(cacheKey)
  }
}
