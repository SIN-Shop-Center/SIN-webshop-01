// Purpose: Product type definitions for Next.js 16 storefront
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)
// Source: Migrated from apps/web/src/data.ts (Vite SPA)

export type ProductVariant = {
  cj_variant_id: string
  sku: string | null
  name: string | null
  price: number | null
  stock: number
  image_url: string | null
}

export interface Product {
  id: string
  title: string
  description: string
  price: number
  originalPrice?: number
  rating: number
  ratingCount: number
  category: string
  categoryId?: string
  subcategory?: string
  imageUrl: string
  imageGallery?: string[]
  stock: number
  isFeatured?: boolean
  soldCount?: number
  createdAt?: string
  colors?: string[]
  sizes?: string[]
  features?: string[]
  specifications?: Record<string, string>
  variants?: ProductVariant[]
}
