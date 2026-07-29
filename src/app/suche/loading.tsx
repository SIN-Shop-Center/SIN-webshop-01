// Purpose: Search page loading skeleton with shimmer cards
// Docs: AGENTS.md

import { ProductCardSkeleton } from '@/components/skeletons/product-card-skeleton'

export default function SucheLoading() {
  return (
    <div
      role="status"
      aria-label="Suche wird geladen"
      className="container mx-auto max-w-6xl px-4 py-8"
    >
      <div className="mb-1 h-8 w-64 skeleton-shimmer rounded" />
      <div className="mb-6 h-4 w-32 skeleton-shimmer rounded" />
      <div className="flex flex-col gap-8 md:flex-row">
        <aside className="md:w-56 md:shrink-0">
          <div className="flex flex-col gap-4">
            <div className="h-10 skeleton-shimmer rounded" />
            <div className="h-10 skeleton-shimmer rounded" />
            <div className="h-10 skeleton-shimmer rounded" />
          </div>
        </aside>
        <div className="flex-1">
          <ProductCardSkeleton count={6} columns={3} />
        </div>
      </div>
    </div>
  )
}
