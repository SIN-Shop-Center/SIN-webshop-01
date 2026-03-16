import type { CartItem, Product } from '@/types'

export type CartProductInput = Pick<Product, 'id' | 'name' | 'price'> & Partial<Product>

export function normalizeProduct(input: CartProductInput): Product {
  return {
    id: input.id,
    name: input.name,
    slug: input.slug || input.id,
    description: input.description || '',
    price: input.price,
    originalPrice: input.originalPrice,
    compareAtPrice: input.compareAtPrice,
    images: input.images || [input.image || '/placeholder.jpg'],
    category: input.category || 'All',
    categoryId: input.categoryId || 'all',
    rating: input.rating || 0,
    reviewCount: input.reviewCount || 0,
    isNew: input.isNew,
    isSale: input.isSale,
    isFeatured: input.isFeatured,
    inStock: input.inStock ?? true,
    badges: input.badges,
    deliveryEstimate: input.deliveryEstimate,
    useCases: input.useCases,
    highlights: input.highlights,
    compareGroup: input.compareGroup,
    bundleCandidateIds: input.bundleCandidateIds,
    popularityScore: input.popularityScore,
    variants: input.variants,
    supplier: input.supplier,
    stock: input.stock ?? 999,
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: input.updatedAt || new Date().toISOString(),
  }
}

export function recalculateTotals(items: CartItem[]) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  return { total, itemCount }
}

export function sanitizeQuantity(quantity: number, fallback = 1): number {
  if (!Number.isFinite(quantity)) {
    return fallback
  }
  const rounded = Math.floor(quantity)
  return rounded > 0 ? rounded : fallback
}

export function getMaxQuantity(product: Product): number {
  if (product.inStock === false) {
    return 0
  }
  if (typeof product.stock === 'number' && Number.isFinite(product.stock)) {
    return product.stock > 0 ? Math.floor(product.stock) : 0
  }
  return 999
}
