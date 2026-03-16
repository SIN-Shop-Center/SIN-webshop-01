import 'server-only'

import { getProductById } from '@/data/sample-products'
import { getApiBaseUrlIfConfigured } from '@/lib/api/base-url'
import { allowCatalogApiFallback } from './catalog-api-fallback'

export type SeoProduct = {
  id: string
  name: string
  description: string
  image: string
  price: number
  rating?: number
  reviewCount?: number
}

function apiBaseUrl(): string {
  return getApiBaseUrlIfConfigured()
}

function asString(input: unknown): string {
  return typeof input === 'string' ? input : ''
}

function asNumber(input: unknown): number | undefined {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return input
  }
  return undefined
}

function fallbackProduct(productId: string): SeoProduct | null {
  const fallback = getProductById(productId)
  if (!fallback) {
    return null
  }

  return {
    id: fallback.id,
    name: fallback.name,
    description: fallback.description || '',
    image: fallback.images[0] || '/placeholder.jpg',
    price: fallback.price,
    rating: fallback.rating,
    reviewCount: fallback.reviewCount,
  }
}

function mapApiProduct(payload: Record<string, unknown>): SeoProduct | null {
  const id = asString(payload.id)
  const name = asString(payload.name)
  const price = asNumber(payload.price)

  if (!id || !name || typeof price !== 'number') {
    return null
  }

  const images = Array.isArray(payload.images) ? payload.images : []
  const firstImage = images.find((entry) => typeof entry === 'string')

  return {
    id,
    name,
    description: asString(payload.description),
    image: typeof firstImage === 'string' && firstImage ? firstImage : '/placeholder.jpg',
    price,
    rating: asNumber(payload.rating),
    reviewCount: asNumber(payload.reviewCount),
  }
}

export async function getSeoProduct(productId: string): Promise<SeoProduct | null> {
  const fallback = allowCatalogApiFallback() ? fallbackProduct(productId) : null
  const baseUrl = apiBaseUrl()
  if (!baseUrl) {
    return fallback
  }

  try {
    const response = await fetch(`${baseUrl}/api/v1/catalog/products/${encodeURIComponent(productId)}`, {
      headers: {
        accept: 'application/json',
      },
      next: {
        revalidate: 300,
      },
    })

    if (!response.ok) {
      return fallback
    }

    const body = (await response.json()) as Record<string, unknown>
    return mapApiProduct(body) || fallback
  } catch {
    return fallback
  }
}
