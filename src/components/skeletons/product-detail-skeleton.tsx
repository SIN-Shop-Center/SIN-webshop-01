// Purpose: Product detail page loading skeleton
// Docs: AGENTS.md

export function ProductDetailSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 pb-28 md:py-12 lg:pb-12">
      {/* Breadcrumbs */}
      <div className="mb-6 flex gap-2">
        <div className="skeleton-shimmer h-4 w-20 rounded" />
        <div className="skeleton-shimmer h-4 w-4 rounded" />
        <div className="skeleton-shimmer h-4 w-32 rounded" />
      </div>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Gallery */}
        <div className="space-y-4">
          <div className="skeleton-shimmer aspect-square rounded-2xl" />
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton-shimmer aspect-square rounded-lg" />
            ))}
          </div>
        </div>

        {/* Buy box */}
        <div className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="skeleton-shimmer h-8 w-full rounded md:h-10" />
              <div className="skeleton-shimmer h-8 w-3/4 rounded md:h-10" />
            </div>
            <div className="skeleton-shimmer h-10 w-10 rounded-full" />
          </div>

          <div className="skeleton-shimmer h-5 w-40 rounded" />

          <div className="rounded-2xl border border-border bg-muted/30 p-5 shadow-sm">
            <div className="mb-4 flex items-end gap-3">
              <div className="skeleton-shimmer h-8 w-28 rounded" />
              <div className="skeleton-shimmer h-5 w-20 rounded" />
            </div>
            <div className="skeleton-shimmer mb-4 h-10 w-full rounded" />
            <div className="skeleton-shimmer h-12 w-full rounded" />
            <div className="mt-5 border-t border-border pt-4">
              <div className="skeleton-shimmer h-16 w-full rounded" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="skeleton-shimmer h-4 w-full rounded" />
            <div className="skeleton-shimmer h-4 w-full rounded" />
            <div className="skeleton-shimmer h-4 w-2/3 rounded" />
          </div>

          <div className="space-y-3">
            <div className="skeleton-shimmer h-5 w-32 rounded" />
            <div className="skeleton-shimmer h-10 w-full rounded" />
          </div>
        </div>
      </div>

      {/* Related products */}
      <div className="mt-16">
        <div className="skeleton-shimmer mb-6 h-7 w-48 rounded" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="skeleton-shimmer aspect-square rounded-lg" />
              <div className="skeleton-shimmer h-4 w-3/4 rounded" />
              <div className="skeleton-shimmer h-5 w-1/3 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
