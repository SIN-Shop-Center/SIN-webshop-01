import type { Product, ProductVariant } from './data'

export interface DbProductViewRow {
  id: string
  title: string | null
  slug: string | null
  description: string | null
  price: number | string | null
  original_price: number | string | null
  compare_at_price: number | string | null
  category_id: string | null
  image_url: string | null
  image_gallery: string[] | null
  stock: number | null
  is_active: boolean | null
  variants: unknown
  metadata: unknown
  rating: number | null
  rating_count: number | null
  sold_count: number | null
  is_featured: boolean | null
  created_at: string | null
  updated_at: string | null
  cj_product_id: string | null
  cj_variant_id: string | null
  manufacturer_name: string | null
  manufacturer_address: string | null
  manufacturer_email: string | null
  manufacturer_phone: string | null
  manufacturer_verified: boolean | null
  responsible_person_name: string | null
  responsible_person_company: string | null
  responsible_person_address: string | null
  responsible_person_email: string | null
  responsible_person_phone: string | null
  responsible_person_verified: boolean | null
  gpsr_verified_at: string | null
}

// ── Transform View-row → Product (camelCase, used by ProductCard) ──────────
function parseVariants(variants: unknown): ProductVariant[] {
  if (Array.isArray(variants)) {
    return variants.filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)).map((v) => ({
      cj_variant_id: String(v.cj_variant_id ?? v.vid ?? ''),
      sku: v.sku != null ? String(v.sku) : v.variantSku != null ? String(v.variantSku) : null,
      name: v.name != null ? String(v.name) : v.variantKey != null ? String(v.variantKey) : null,
      price: v.price != null ? Number(v.price) : v.variantSellPrice != null ? Number(v.variantSellPrice) : null,
      stock: Number(v.stock ?? v.variantStock ?? 0),
      image_url: v.image_url != null ? String(v.image_url) : v.variantImage != null ? String(v.variantImage) : null,
    }))
  }
  return []
}

export function transformProduct(row: DbProductViewRow): Product {
  const metadata = (row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata) ? row.metadata : {}) as {
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
    title: row.title ?? '',
    description: row.description ?? '',
    price: row.price == null ? 0 : typeof row.price === 'string' ? Number(row.price) : row.price,
    originalPrice:
      row.original_price != null
        ? typeof row.original_price === 'string'
          ? Number(row.original_price)
          : row.original_price
        : undefined,
    rating: row.rating ?? 0,
    ratingCount: row.rating_count ?? 0,
    category: '',
    categoryId: row.category_id ?? undefined,
    subcategory: undefined,
    imageUrl: row.image_url ?? '',
    imageGallery,
    stock: row.stock ?? 0,
    soldCount: row.sold_count ?? undefined,
    createdAt: row.created_at ?? undefined,
    isFeatured: row.is_featured ?? false,
    colors: row.variants && typeof row.variants === 'object' && !Array.isArray(row.variants) ? (row.variants as Record<string, unknown>).colors as string[] | undefined : undefined,
    sizes: row.variants && typeof row.variants === 'object' && !Array.isArray(row.variants) ? (row.variants as Record<string, unknown>).sizes as string[] | undefined : undefined,
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
