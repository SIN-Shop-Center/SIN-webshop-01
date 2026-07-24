import type { Product, ProductVariant } from './data'

export interface DbProductViewRow {
  id: string
  title: string
  slug: string
  description: string | null
  price: number | string
  original_price: number | string | null
  compare_at_price: number | string | null
  category_id: string | null
  image_url: string
  image_gallery: string[]
  stock: number
  is_active: boolean
  variants: Record<string, any>[] | Record<string, any> | null
  metadata: Record<string, any> | null
  rating: number
  rating_count: number
  sold_count: number | null
  is_featured: boolean
  created_at: string
  updated_at: string
  cj_product_id: string | null
  cj_variant_id: string | null
  manufacturer_name: string | null
  manufacturer_address: string | null
  manufacturer_email: string | null
  manufacturer_phone: string | null
  manufacturer_verified: boolean
  responsible_person_name: string | null
  responsible_person_company: string | null
  responsible_person_address: string | null
  responsible_person_email: string | null
  responsible_person_phone: string | null
  responsible_person_verified: boolean
  gpsr_verified_at: string | null
}

// ── Transform View-row → Product (camelCase, used by ProductCard) ──────────
function parseVariants(variants: unknown): ProductVariant[] {
  if (Array.isArray(variants)) {
    return variants.map((v: Record<string, any>) => ({
      cj_variant_id: String(v.cj_variant_id ?? v.vid ?? ''),
      sku: v.sku ?? v.variantSku ?? null,
      name: v.name ?? v.variantKey ?? null,
      price: v.price != null ? Number(v.price) : v.variantSellPrice != null ? Number(v.variantSellPrice) : null,
      stock: Number(v.stock ?? v.variantStock ?? 0),
      image_url: v.image_url ?? v.variantImage ?? null,
    }))
  }
  return []
}

export function transformProduct(row: DbProductViewRow): Product {
  const metadata = (row.metadata ?? {}) as {
    selling_points?: string[]
    features?: string[]
    specifications?: Record<string, string> | Array<{ name?: string; value?: string }>
  }
  const variants = parseVariants(row.variants)
  const specifications = Array.isArray(metadata.specifications)
    ? Object.fromEntries(
        metadata.specifications
          .filter((item) => item?.name && item?.value)
          .map((item) => [String(item.name), String(item.value)]),
      )
    : metadata.specifications

  // Parse image_gallery: DB stores as JSON string, not JSONB
  let imageGallery: string[] = []
  if (typeof row.image_gallery === 'string') {
    try {
      const parsed = JSON.parse(row.image_gallery)
      imageGallery = Array.isArray(parsed)
        ? parsed.flat(2).filter((img): img is string => typeof img === 'string' && Boolean(img))
        : []
    } catch {
      imageGallery = []
    }
  } else if (Array.isArray(row.image_gallery)) {
    imageGallery = row.image_gallery
      .flat(2)
      .filter((img): img is string => typeof img === 'string' && Boolean(img))
  }

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    price: typeof row.price === 'string' ? Number(row.price) : row.price,
    originalPrice:
      row.original_price != null
        ? typeof row.original_price === 'string'
          ? Number(row.original_price)
          : row.original_price
        : undefined,
    rating: row.rating,
    ratingCount: row.rating_count,
    category: '',
    categoryId: row.category_id ?? undefined,
    subcategory: undefined,
    imageUrl: row.image_url,
    imageGallery,
    stock: row.stock,
    soldCount: row.sold_count ?? undefined,
    createdAt: row.created_at,
    isFeatured: row.is_featured,
    colors: row.variants && !Array.isArray(row.variants) ? (row.variants as Record<string, any>).colors : undefined,
    sizes: row.variants && !Array.isArray(row.variants) ? (row.variants as Record<string, any>).sizes : undefined,
    variants: variants.length > 0 ? variants : undefined,
    features: metadata.selling_points ?? metadata.features,
    specifications,
    manufacturer:
      row.manufacturer_verified && row.manufacturer_name && row.manufacturer_address && row.manufacturer_email
        ? {
            name: row.manufacturer_name,
            address: row.manufacturer_address,
            email: row.manufacturer_email,
            phone: row.manufacturer_phone ?? undefined,
          }
        : undefined,
    responsiblePerson:
      row.responsible_person_verified &&
      row.responsible_person_name &&
      row.responsible_person_address &&
      row.responsible_person_email
        ? {
            name: row.responsible_person_name,
            company: row.responsible_person_company ?? undefined,
            address: row.responsible_person_address,
            email: row.responsible_person_email,
            phone: row.responsible_person_phone ?? undefined,
          }
        : undefined,
    gpsrVerifiedAt: row.gpsr_verified_at ?? undefined,
  }
}
