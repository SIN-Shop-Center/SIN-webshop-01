import type { CatalogCategory, CatalogProduct } from '@simone/contracts'
import { sampleCategories, sampleProducts } from '@/data/sample-products'
import type { Category, Product } from '@/types'
import { DEFAULT_IMAGE } from './client-constants'
import { enrichProduct } from './commerce'

function toCategoryReference(product: CatalogProduct): NonNullable<Product['category']> {
  const fallback = 'allgemein'
  const id = product.categoryId || fallback
  const name = product.categoryName || 'Allgemein'
  const slug = product.categorySlug || id
  return { id, name, slug }
}

export function toUIProduct(product: CatalogProduct): Product {
  const categoryRef = toCategoryReference(product)
  const rating = typeof product.rating === 'number' ? product.rating : undefined
  const reviewCount = typeof product.reviewCount === 'number' ? product.reviewCount : undefined

  return enrichProduct({
    id: product.id,
    slug: product.slug || product.id,
    name: product.name,
    description: product.description || '',
    price: product.price,
    originalPrice: product.originalPrice,
    compareAtPrice: product.originalPrice,
    images: product.images.length ? product.images : [DEFAULT_IMAGE],
    category: categoryRef,
    categoryId: categoryRef.id,
    rating,
    reviewCount,
    inStock: product.stock > 0 && product.isActive,
    isSale: typeof product.originalPrice === 'number' && product.originalPrice > product.price,
    stock: product.stock,
    createdAt: product.createdAt || new Date().toISOString(),
    updatedAt: product.updatedAt || new Date().toISOString(),
  })
}

export function normalizeLegacySampleProduct(product: Product): Product {
  if (typeof product.category === 'object' && product.category !== null) {
    return enrichProduct({
      ...product,
      images: product.images.length ? product.images : [DEFAULT_IMAGE],
      inStock: product.inStock ?? product.stock > 0,
    })
  }

  const knownCategory = sampleCategories.find((entry) => entry.id === product.categoryId)
  return enrichProduct({
    ...product,
    category: {
      id: knownCategory?.id || product.categoryId || 'allgemein',
      name: knownCategory?.name || (typeof product.category === 'string' ? product.category : 'Allgemein'),
      slug: knownCategory?.slug || product.categoryId || 'allgemein',
    },
    images: product.images.length ? product.images : [DEFAULT_IMAGE],
    inStock: product.inStock ?? product.stock > 0,
    compareAtPrice: product.compareAtPrice || product.originalPrice,
  })
}

export function normalizeSampleProducts(items: Product[]): Product[] {
  return items.map(normalizeLegacySampleProduct)
}

export function normalizeSampleCategories(): Category[] {
  return sampleCategories.map((category) => ({
    ...category,
    productCount: sampleProducts.filter((product) => product.categoryId === category.id).length,
  }))
}

export function toUICategory(category: CatalogCategory): Category {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description || undefined,
    image: category.image || undefined,
    productCount: undefined,
  }
}
