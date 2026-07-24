export type BadgeVariant = 'sale' | 'highlight' | 'info' | 'urgency' | 'trust'

export type ProductBadge = {
  id: string
  label: string
  variant: BadgeVariant
  priority: number
}

const FREE_SHIPPING_THRESHOLD = 49
const NEW_PRODUCT_DAYS = 14
const LOW_STOCK_THRESHOLD = 5
const TOP_RATING_MIN = 4.5
const TOP_RATING_MIN_COUNT = 10
const BESTSELLER_MIN_SOLD = 100

export function getProductBadges(product: {
  price: number
  originalPrice?: number | null
  stock: number
  rating?: number
  ratingCount?: number
  soldCount?: number
  isFeatured?: boolean
  createdAt?: string | Date | null
}): ProductBadge[] {
  const badges: ProductBadge[] = []

  if (product.originalPrice && product.originalPrice > product.price) {
    const discount = Math.round(
      ((product.originalPrice - product.price) / product.originalPrice) * 100,
    )
    if (discount >= 5) {
      badges.push({ id: 'sale', label: `-${discount} %`, variant: 'sale', priority: 1 })
    }
  }

  if (product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD) {
    badges.push({ id: 'low-stock', label: `Nur noch ${product.stock}`, variant: 'urgency', priority: 2 })
  }

  if ((product.soldCount ?? 0) >= BESTSELLER_MIN_SOLD) {
    badges.push({ id: 'bestseller', label: `${formatSold(product.soldCount!)} verkauft`, variant: 'highlight', priority: 3 })
  } else if (product.isFeatured) {
    badges.push({ id: 'featured', label: 'Bestseller', variant: 'highlight', priority: 3 })
  }

  if ((product.rating ?? 0) >= TOP_RATING_MIN && (product.ratingCount ?? 0) >= TOP_RATING_MIN_COUNT) {
    badges.push({ id: 'top-rated', label: `★ ${product.rating!.toFixed(1)}`, variant: 'trust', priority: 4 })
  }

  if (product.createdAt) {
    const ageDays = (Date.now() - new Date(product.createdAt).getTime()) / 86_400_000
    if (ageDays <= NEW_PRODUCT_DAYS) {
      badges.push({ id: 'new', label: 'Neu', variant: 'info', priority: 5 })
    }
  }

  if (product.price >= FREE_SHIPPING_THRESHOLD) {
    badges.push({ id: 'free-shipping', label: 'Gratisversand', variant: 'trust', priority: 6 })
  }

  return badges.sort((a, b) => a.priority - b.priority).slice(0, 3)
}

function formatSold(count: number): string {
  if (count >= 10_000) return `${Math.floor(count / 1000)}K+`
  if (count >= 1_000) return `${(count / 1000).toFixed(1).replace('.', ',')}K+`
  return `${count}+`
}
