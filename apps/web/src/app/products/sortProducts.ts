import type { Product } from '@/types'

export function sortProducts(items: Product[], sortBy: string) {
  const output = [...items]
  switch (sortBy) {
    case 'popular':
      return output.sort((a, b) => (b.popularityScore ?? b.reviewCount ?? 0) - (a.popularityScore ?? a.reviewCount ?? 0))
    case 'top-rated':
      return output.sort((a, b) => {
        const ratingDiff = (b.rating ?? 0) - (a.rating ?? 0)
        if (ratingDiff !== 0) {
          return ratingDiff
        }
        return (b.reviewCount ?? 0) - (a.reviewCount ?? 0)
      })
    case 'fast-shipping':
      return output.sort((a, b) => {
        const leftFast = (a.deliveryEstimate || '').toLowerCase().includes('24-48h') ? 1 : 0
        const rightFast = (b.deliveryEstimate || '').toLowerCase().includes('24-48h') ? 1 : 0
        if (rightFast !== leftFast) {
          return rightFast - leftFast
        }
        return (b.popularityScore ?? 0) - (a.popularityScore ?? 0)
      })
    case 'price-asc':
      return output.sort((a, b) => a.price - b.price)
    case 'price-desc':
      return output.sort((a, b) => b.price - a.price)
    case 'name-asc':
      return output.sort((a, b) => a.name.localeCompare(b.name))
    case 'name-desc':
      return output.sort((a, b) => b.name.localeCompare(a.name))
    default:
      return output.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
  }
}
