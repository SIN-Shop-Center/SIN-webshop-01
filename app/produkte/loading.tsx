// Purpose: Product listing loading skeleton with shimmer cards
// Docs: AGENTS.md

import { ProductCardSkeleton } from '@/components/skeletons/product-card-skeleton'

export default function ProdukteLoading() {
  return (
    <div
      role="status"
      aria-label="Produkte werden geladen"
      className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
    >
      <div className="pb-6">
        <div className="h-8 w-48 skeleton-shimmer rounded-md" />
        <div className="mt-2 h-4 w-24 skeleton-shimmer rounded-md" />
      </div>
      <ProductCardSkeleton count={12} />
    </div>
  )
}
