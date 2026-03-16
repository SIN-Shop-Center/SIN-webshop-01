import type { Category, Product } from '@/types'
import {
  CATEGORIES_CACHE_MAX_ENTRIES,
  PRODUCT_DETAIL_CACHE_MAX_ENTRIES,
  PRODUCTS_CACHE_MAX_ENTRIES,
} from './client-constants'
import { deleteStorageEntry, readStorageEntry, writeStorageEntry } from './client-storage'
import type { CacheEntry, CacheNamespace, CatalogCaches, CatalogInFlight } from './client-types'

const productListCache = new Map<string, CacheEntry<Product[]>>()
const productDetailCache = new Map<string, CacheEntry<Product | null>>()
const categoriesCache = new Map<string, CacheEntry<Category[]>>()

const productListInFlight = new Map<string, Promise<Product[]>>()
const productDetailInFlight = new Map<string, Promise<Product | null>>()
const categoriesInFlight = new Map<string, Promise<Category[]>>()

export const catalogCaches: CatalogCaches = {
  productListCache,
  productDetailCache,
  categoriesCache,
}

export const catalogInFlight: CatalogInFlight = {
  productListInFlight,
  productDetailInFlight,
  categoriesInFlight,
}

function cacheLimitFor<T>(cache: Map<string, CacheEntry<T>>): number {
  if (cache === productListCache) {
    return PRODUCTS_CACHE_MAX_ENTRIES
  }
  if (cache === productDetailCache) {
    return PRODUCT_DETAIL_CACHE_MAX_ENTRIES
  }
  return CATEGORIES_CACHE_MAX_ENTRIES
}

function trimCache<T>(cache: Map<string, CacheEntry<T>>, maxEntries: number, namespace?: CacheNamespace) {
  if (cache.size <= maxEntries) {
    return
  }

  const now = Date.now()
  const expiredKeys: string[] = []
  cache.forEach((entry, key) => {
    if (entry.expiresAt <= now) {
      expiredKeys.push(key)
    }
  })

  expiredKeys.forEach((key) => {
    cache.delete(key)
    if (namespace) {
      deleteStorageEntry(namespace, key)
    }
  })

  while (cache.size > maxEntries) {
    const oldestKey = cache.keys().next().value as string | undefined
    if (!oldestKey) {
      return
    }
    cache.delete(oldestKey)
    if (namespace) {
      deleteStorageEntry(namespace, oldestKey)
    }
  }
}

export function readCacheEntry<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  namespace?: CacheNamespace,
): CacheEntry<T> | null {
  const cached = cache.get(key)
  if (cached) {
    if (cached.expiresAt > Date.now()) {
      return cached
    }
    cache.delete(key)
    if (namespace) {
      deleteStorageEntry(namespace, key)
    }
  }

  if (!namespace) {
    return null
  }

  const persisted = readStorageEntry<T>(namespace, key)
  if (!persisted) {
    return null
  }

  cache.set(key, persisted)
  trimCache(cache, cacheLimitFor(cache), namespace)
  return persisted
}

export function readCache<T>(cache: Map<string, CacheEntry<T>>, key: string, namespace?: CacheNamespace): T | null {
  const entry = readCacheEntry(cache, key, namespace)
  return entry ? entry.value : null
}

export function readStaleCacheEntry<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  namespace?: CacheNamespace,
): CacheEntry<T> | null {
  const cached = cache.get(key)
  if (cached) {
    return cached
  }

  if (!namespace) {
    return null
  }

  const persisted = readStorageEntry<T>(namespace, key, { allowExpired: true })
  if (!persisted) {
    return null
  }

  cache.set(key, persisted)
  trimCache(cache, cacheLimitFor(cache), namespace)
  return persisted
}

export function writeCache<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  value: T,
  ttlMs: number,
  namespace?: CacheNamespace,
): T {
  if (cache.has(key)) {
    cache.delete(key)
  }

  const entry = {
    value,
    expiresAt: Date.now() + ttlMs,
  }

  cache.set(key, entry)
  if (namespace) {
    writeStorageEntry(namespace, key, entry)
  }

  trimCache(cache, cacheLimitFor(cache), namespace)
  return value
}
