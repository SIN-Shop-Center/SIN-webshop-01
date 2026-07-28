// Purpose: Global loading skeleton with shimmer cards
// Docs: AGENTS.md

import { ProductCardSkeleton } from '@/components/skeletons/product-card-skeleton'

export default function GlobalLoading() {
  return (
    <div
      role="status"
      aria-label="Wird geladen"
      className="container mx-auto px-4 py-12"
    >
      <div className="mb-8 h-9 w-64 skeleton-shimmer rounded-md" />
      <ProductCardSkeleton count={8} />
    </div>
  )
}
