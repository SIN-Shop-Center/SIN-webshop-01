import 'server-only'

import { CatalogCategoryListSchema, CatalogProductListSchema } from '@simone/contracts'
import { sampleCategories, sampleProducts } from '@/data/sample-products'
import { normalizeSampleCategories, normalizeSampleProducts, toUICategory, toUIProduct } from '@/features/catalog/client-normalizers'
import { getApiBaseUrlIfConfigured } from '@/lib/api/base-url'
import type { Category, Product } from '@/types'
import { allowCatalogApiFallback } from './catalog-api-fallback'

function apiBaseUrl(): string {
  return getApiBaseUrlIfConfigured()
}

function fallbackProducts(limit = 120): Product[] {
  return normalizeSampleProducts(sampleProducts).slice(0, limit)
}

function fallbackCategories(): Category[] {
  return normalizeSampleCategories()
}

export async function getInitialCatalogProducts(limit = 120): Promise<Product[]> {
  const baseUrl = apiBaseUrl()
  if (!baseUrl) {
    return allowCatalogApiFallback() ? fallbackProducts(limit) : []
  }

  try {
    const response = await fetch(`${baseUrl}/api/v1/catalog/products?limit=${limit}`, {
      headers: { accept: 'application/json' },
      next: { revalidate: 300 },
    })
    if (!response.ok) {
      return allowCatalogApiFallback() ? fallbackProducts(limit) : []
    }
    const payload = CatalogProductListSchema.parse(await response.json())
    if (payload.items.length === 0) {
      return allowCatalogApiFallback() ? fallbackProducts(limit) : []
    }
    return payload.items.map(toUIProduct)
  } catch {
    return allowCatalogApiFallback() ? fallbackProducts(limit) : []
  }
}

export async function getInitialCatalogCategories(): Promise<Category[]> {
  const baseUrl = apiBaseUrl()
  if (!baseUrl) {
    return allowCatalogApiFallback() ? fallbackCategories() : []
  }

  try {
    const response = await fetch(`${baseUrl}/api/v1/catalog/categories`, {
      headers: { accept: 'application/json' },
      next: { revalidate: 300 },
    })
    if (!response.ok) {
      return allowCatalogApiFallback() ? fallbackCategories() : []
    }
    const payload = CatalogCategoryListSchema.parse(await response.json())
    if (payload.items.length === 0) {
      return allowCatalogApiFallback() ? fallbackCategories() : []
    }
    return payload.items.map(toUICategory)
  } catch {
    return allowCatalogApiFallback() ? fallbackCategories() : []
  }
}
