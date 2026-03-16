import type { CartItem, Product, ProductBadge } from '@/types'

const CATEGORY_USE_CASES: Record<string, string[]> = {
  'cat-1': ['Pendeln', 'Home Office', 'Reisen'],
  'cat-2': ['Alltag', 'Outfits', 'Geschenke'],
  'cat-3': ['Home Office', 'Routine Start', 'Zuhause nutzen'],
  'cat-4': ['Workout', 'Recovery', 'Unterwegs'],
  'cat-5': ['Routine Start', 'Selbstpflege', 'Geschenke'],
  'cat-6': ['Familie', 'Geschenke', 'Zuhause nutzen'],
}

const CATEGORY_HIGHLIGHTS: Record<string, string[]> = {
  'cat-1': ['Technik direkt sichtbar', 'Schnell einsatzbereit', 'Passt in mobile Routinen'],
  'cat-2': ['Einfach kombinierbar', 'Schneller Stil-Upgrade', 'Klar im Alltag nutzbar'],
  'cat-3': ['Home klar sortiert', 'Pflege ohne Overload', 'Sofort im Einsatz'],
  'cat-4': ['Routine bleibt stabil', 'Einfach mitnehmen', 'Fühlt sich direkt sinnvoll an'],
  'cat-5': ['Vier Schritte sauber zusammengefasst', 'Einfacher Einstieg', 'Routinen statt Regalchaos'],
  'cat-6': ['Funktioniert im Familienalltag', 'Schnell verstanden', 'Direkt verschenkbar'],
}

const BUNDLE_CATEGORY_MAP: Record<string, string[]> = {
  'cat-1': ['cat-3', 'cat-4'],
  'cat-2': ['cat-5', 'cat-6'],
  'cat-3': ['cat-1', 'cat-5'],
  'cat-4': ['cat-1', 'cat-3'],
  'cat-5': ['cat-2', 'cat-3'],
  'cat-6': ['cat-2', 'cat-5'],
}

function ensureCategoryReference(product: Product): NonNullable<Product['category']> {
  if (typeof product.category === 'object' && product.category !== null) {
    return product.category
  }

  const id = product.categoryId || 'allgemein'
  const fallbackName = typeof product.category === 'string' && product.category ? product.category : 'Allgemein'
  return {
    id,
    name: fallbackName,
    slug: id,
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildPopularityScore(product: Product) {
  const rating = typeof product.rating === 'number' ? product.rating : 0
  const reviewCount = typeof product.reviewCount === 'number' ? product.reviewCount : 0
  const stock = typeof product.stock === 'number' ? product.stock : 0
  const inStock = product.inStock ?? stock > 0

  const ratingScore = rating * 22
  const reviewScore = Math.sqrt(reviewCount) * 12
  const stockScore = clamp(stock, 0, 160) / 4
  const freshnessBonus = product.isNew ? 12 : 0
  const saleBonus = product.isSale || (typeof product.compareAtPrice === 'number' && product.compareAtPrice > product.price) ? 10 : 0
  const availabilityBonus = inStock ? 18 : -30

  return Math.round(ratingScore + reviewScore + stockScore + freshnessBonus + saleBonus + availabilityBonus)
}

function buildDeliveryEstimate(product: Product) {
  const stock = typeof product.stock === 'number' ? product.stock : 0
  const inStock = product.inStock ?? stock > 0

  if (!inStock) {
    return 'Derzeit nicht lieferbar'
  }

  if (stock <= 5) {
    return 'Wenig Bestand, Versand 24-48h'
  }

  if (stock <= 25) {
    return 'Versand 24-48h'
  }

  return 'Sofort lieferbar 24-48h'
}

function buildUseCases(product: Product) {
  if (Array.isArray(product.useCases) && product.useCases.length > 0) {
    return product.useCases
  }

  const mapped = CATEGORY_USE_CASES[product.categoryId] || ['Alltag', 'Schneller Kauf', 'Zuhause nutzen']
  const tagUseCases = (product.tags || []).slice(0, 2)
  return Array.from(new Set([...tagUseCases, ...mapped])).slice(0, 3)
}

function buildHighlights(product: Product) {
  if (Array.isArray(product.highlights) && product.highlights.length > 0) {
    return product.highlights
  }

  const highlights = [...(CATEGORY_HIGHLIGHTS[product.categoryId] || ['Schnell verstanden', 'Klarer Nutzen', 'Direkt bestellbar'])]
  if (typeof product.reviewCount === 'number' && product.reviewCount > 300) {
    highlights.unshift('Viele positive Kaufmomente')
  }
  if (typeof product.compareAtPrice === 'number' && product.compareAtPrice > product.price) {
    highlights.unshift('Klare Ersparnis im Kaufmoment')
  }
  return Array.from(new Set(highlights)).slice(0, 3)
}

function buildBadges(product: Product): ProductBadge[] {
  if (Array.isArray(product.badges) && product.badges.length > 0) {
    return product.badges
  }

  const badges: ProductBadge[] = []
  const reviewCount = typeof product.reviewCount === 'number' ? product.reviewCount : 0
  const stock = typeof product.stock === 'number' ? product.stock : 0
  const hasDiscount = typeof product.compareAtPrice === 'number' && product.compareAtPrice > product.price

  if (reviewCount >= 300) {
    badges.push({ id: 'bestseller', label: 'Bestseller', tone: 'dark' })
  }
  if (product.isNew) {
    badges.push({ id: 'new', label: 'Neu', tone: 'neutral' })
  }
  if (hasDiscount) {
    badges.push({ id: 'sale', label: 'Angebot', tone: 'accent' })
  }
  if (stock > 0 && stock <= 5) {
    badges.push({ id: 'low-stock', label: 'Wenig Bestand', tone: 'neutral' })
  }
  if ((product.inStock ?? stock > 0) && badges.length === 0) {
    badges.push({ id: 'fast-shipping', label: 'Schnell lieferbar', tone: 'neutral' })
  }

  return badges.slice(0, 2)
}

function uniqueById(items: Product[]) {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false
    }
    seen.add(item.id)
    return true
  })
}

function sortByPopularity(items: Product[]) {
  return [...items].sort((a, b) => {
    const scoreDiff = (b.popularityScore ?? 0) - (a.popularityScore ?? 0)
    if (scoreDiff !== 0) {
      return scoreDiff
    }
    const reviewDiff = (b.reviewCount ?? 0) - (a.reviewCount ?? 0)
    if (reviewDiff !== 0) {
      return reviewDiff
    }
    return b.price - a.price
  })
}

function preferredBundleCategories(product: Product) {
  return BUNDLE_CATEGORY_MAP[product.categoryId] || []
}

export function enrichProduct(product: Product): Product {
  const category = ensureCategoryReference(product)
  const stock = typeof product.stock === 'number' ? product.stock : 0
  const inStock = product.inStock ?? stock > 0
  const compareAtPrice = product.compareAtPrice ?? product.originalPrice
  const normalized: Product = {
    ...product,
    category,
    categoryId: product.categoryId || category.id,
    compareAtPrice,
    inStock,
    deliveryEstimate: product.deliveryEstimate || buildDeliveryEstimate(product),
    useCases: buildUseCases(product),
    highlights: buildHighlights(product),
    badges: buildBadges(product),
    compareGroup: product.compareGroup || product.categoryId || category.slug,
    bundleCandidateIds: product.bundleCandidateIds || preferredBundleCategories(product),
    popularityScore: typeof product.popularityScore === 'number' ? product.popularityScore : buildPopularityScore(product),
  }

  return normalized
}

export function enrichProducts(items: Product[]) {
  return uniqueById(items.map(enrichProduct))
}

export function matchesBadge(product: Product, badgeId: string) {
  return (product.badges || []).some((badge) => badge.id === badgeId)
}

export function matchesUseCase(product: Product, useCase: string) {
  const needle = slugify(useCase)
  return (product.useCases || []).some((entry) => slugify(entry) === needle)
}

export function getBestsellerProducts(items: Product[], limit = 4) {
  return sortByPopularity(enrichProducts(items)).slice(0, limit)
}

export function getNewArrivalProducts(items: Product[], limit = 4) {
  return sortByPopularity(enrichProducts(items).filter((product) => product.isNew)).slice(0, limit)
}

export function getFastShippingProducts(items: Product[], limit = 4) {
  return sortByPopularity(
    enrichProducts(items).filter((product) => (product.deliveryEstimate || '').toLowerCase().includes('24-48h')),
  ).slice(0, limit)
}

export function getProductsForUseCase(items: Product[], useCase: string, limit = 4) {
  return sortByPopularity(enrichProducts(items).filter((product) => matchesUseCase(product, useCase))).slice(0, limit)
}

export function getCompareCandidates(items: Product[], currentProduct: Product, limit = 3) {
  const current = enrichProduct(currentProduct)
  const candidates = enrichProducts(items).filter(
    (item) =>
      item.id !== current.id &&
      (item.compareGroup === current.compareGroup || item.categoryId === current.categoryId),
  )

  return [...candidates]
    .sort((left, right) => {
      const leftScore =
        Math.abs(left.price - current.price) * -0.2 +
        (left.popularityScore ?? 0) +
        ((left.reviewCount ?? 0) > 200 ? 12 : 0)
      const rightScore =
        Math.abs(right.price - current.price) * -0.2 +
        (right.popularityScore ?? 0) +
        ((right.reviewCount ?? 0) > 200 ? 12 : 0)
      return rightScore - leftScore
    })
    .slice(0, limit)
}

export function getBundleCandidates(items: Product[], currentProduct: Product, limit = 3) {
  const current = enrichProduct(currentProduct)
  const preferredCategories = new Set(preferredBundleCategories(current))

  const preferred = enrichProducts(items).filter(
    (item) => item.id !== current.id && preferredCategories.has(item.categoryId),
  )

  if (preferred.length >= limit) {
    return sortByPopularity(preferred).slice(0, limit)
  }

  const fallback = enrichProducts(items).filter(
    (item) => item.id !== current.id && item.categoryId !== current.categoryId && !preferredCategories.has(item.categoryId),
  )

  return uniqueById([...sortByPopularity(preferred), ...sortByPopularity(fallback)]).slice(0, limit)
}

export function getComplementaryProducts(items: Product[], cartItems: CartItem[], limit = 4) {
  if (cartItems.length === 0) {
    return []
  }

  const cartProductIds = new Set(cartItems.map((item) => item.product.id))
  const categoryTargets = new Set<string>()

  cartItems.forEach((item) => {
    preferredBundleCategories(enrichProduct(item.product)).forEach((categoryId) => {
      categoryTargets.add(categoryId)
    })
  })

  const preferred = enrichProducts(items).filter(
    (product) => !cartProductIds.has(product.id) && categoryTargets.has(product.categoryId),
  )

  if (preferred.length >= limit) {
    return sortByPopularity(preferred).slice(0, limit)
  }

  const fallback = enrichProducts(items).filter((product) => !cartProductIds.has(product.id))
  return uniqueById([...sortByPopularity(preferred), ...sortByPopularity(fallback)]).slice(0, limit)
}

export function getRecentlyViewedProducts(items: Product[], recentIds: string[], limit = 4) {
  const byId = new Map(enrichProducts(items).map((product) => [product.id, product]))
  return recentIds
    .map((id) => byId.get(id))
    .filter((product): product is Product => Boolean(product))
    .slice(0, limit)
}

export function getValuePicks(items: Product[], maxPrice: number, limit = 4) {
  return sortByPopularity(enrichProducts(items).filter((product) => product.price <= maxPrice)).slice(0, limit)
}

export function getTopRatedProducts(items: Product[], limit = 4) {
  return [...enrichProducts(items)]
    .sort((left, right) => {
      const ratingDiff = (right.rating ?? 0) - (left.rating ?? 0)
      if (ratingDiff !== 0) {
        return ratingDiff
      }
      return (right.reviewCount ?? 0) - (left.reviewCount ?? 0)
    })
    .slice(0, limit)
}
