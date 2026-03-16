import type {
  CatalogCategory,
  CatalogCategoryList,
  CatalogProduct,
  CatalogProductList,
  PromotionBanner,
  PromotionBannerList,
} from '@simone/contracts'
import { sampleCategories, sampleProducts } from '@/data/sample-products'

const FALLBACK_FLAG = 'NEXT_PUBLIC_WEB_CATALOG_FALLBACK_ENABLED'
const PROMOTION_PLACEMENTS = new Set(['all', 'header', 'pdp', 'cart'])
const PROMOTION_SEGMENTS = new Set(['all', 'b2c', 'b2b'])

function toggleValue(): string {
  return String(process.env[FALLBACK_FLAG] || '').trim().toLowerCase()
}

function hasCatalogApiConfig(): boolean {
  return String(process.env.INTERNAL_API_URL || '').trim().length > 0
}

function toPositiveInt(input: string | null, fallback: number, max: number): number {
  const parsed = Number.parseInt(input || '', 10)
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback
  }
  return Math.min(parsed, max)
}

function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function toCatalogCategory(input: (typeof sampleCategories)[number]): CatalogCategory {
  return {
    id: input.id,
    name: input.name,
    slug: input.slug,
    description: input.description || null,
    image: input.image || null,
    isActive: true,
  }
}

function toCatalogProduct(input: (typeof sampleProducts)[number]): CatalogProduct {
  return {
    id: input.id,
    sku: input.id,
    name: input.name,
    slug: slugify(input.name),
    description: input.description,
    price: input.price,
    originalPrice: input.originalPrice,
    images: input.images || [],
    stock: input.stock || 0,
    isActive: true,
    categoryId: input.categoryId,
    categoryName: typeof input.category === 'string' ? input.category : input.category?.name,
    categorySlug: input.categoryId,
    rating: input.rating ?? null,
    reviewCount: input.reviewCount ?? null,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  }
}

function parsePlacement(raw: string | null): 'all' | 'header' | 'pdp' | 'cart' {
  const candidate = String(raw || '').trim().toLowerCase()
  if (PROMOTION_PLACEMENTS.has(candidate)) {
    return candidate as 'all' | 'header' | 'pdp' | 'cart'
  }
  return 'all'
}

function parseSegment(raw: string | null): 'all' | 'b2c' | 'b2b' {
  const candidate = String(raw || '').trim().toLowerCase()
  if (PROMOTION_SEGMENTS.has(candidate)) {
    return candidate as 'all' | 'b2c' | 'b2b'
  }
  return 'all'
}

function promotionText(segment: 'all' | 'b2c' | 'b2b'): string {
  if (segment === 'b2b') {
    return 'B2B Staffelpreise aktiv: Ab 499 EUR versandkostenfrei.'
  }
  if (segment === 'b2c') {
    return 'Heute: 10% auf Bestseller mit Code SIMONE10.'
  }
  return 'Willkommensangebot: 10% auf deine erste Bestellung.'
}

export function allowCatalogApiFallback(): boolean {
  const toggle = toggleValue()
  if (toggle === 'true') {
    return true
  }
  if (toggle === 'false') {
    return false
  }
  if (!hasCatalogApiConfig()) {
    return true
  }
  return process.env.NODE_ENV !== 'production'
}

export function catalogProductsFallback(searchParams: URLSearchParams): CatalogProductList {
  const limit = toPositiveInt(searchParams.get('limit'), 120, 240)
  const category = String(searchParams.get('category') || '').trim()
  const items = sampleProducts
    .filter((product) => (category ? product.categoryId === category : true))
    .slice(0, limit)
    .map(toCatalogProduct)

  return {
    items,
    page: 1,
    limit,
  }
}

export function catalogProductFallback(productID: string): CatalogProduct | null {
  const fallback = sampleProducts.find((product) => product.id === productID)
  if (!fallback) {
    return null
  }
  return toCatalogProduct(fallback)
}

export function catalogCategoriesFallback(): CatalogCategoryList {
  return {
    items: sampleCategories.map(toCatalogCategory),
  }
}

export function promotionsFallback(searchParams: URLSearchParams): PromotionBannerList {
  const now = new Date()
  const placement = parsePlacement(searchParams.get('placement'))
  const segment = parseSegment(searchParams.get('segment'))
  const limit = toPositiveInt(searchParams.get('limit'), 3, 6)

  const item: PromotionBanner = {
    id: `fallback-${placement}-${segment}`,
    name: 'Fallback Promotion',
    type: 'percentage',
    code: segment === 'b2b' ? 'B2B10' : 'SIMONE10',
    bannerText: promotionText(segment),
    bannerColor: '#0f766e',
    placement,
    segmentScope: segment,
    discountValue: undefined,
    discountPercentage: 10,
    minimumOrder: segment === 'b2b' ? 499 : 0,
    startDate: now.toISOString(),
    endDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  }

  return {
    items: [item].slice(0, limit),
  }
}
