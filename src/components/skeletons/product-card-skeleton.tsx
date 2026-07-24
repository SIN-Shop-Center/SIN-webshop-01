// Purpose: Reusable product card loading skeleton with shimmer
// Docs: AGENTS.md

interface ProductCardSkeletonProps {
  count?: number
  className?: string
  columns?: 2 | 3 | 4
}

export function ProductCardSkeleton({
  count = 8,
  className = '',
  columns,
}: ProductCardSkeletonProps) {
  const gridClass =
    columns === 2
      ? 'grid-cols-2'
      : columns === 3
        ? 'grid-cols-2 sm:grid-cols-3'
        : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'

  return (
    <div className={`grid gap-4 ${gridClass} ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card"
          style={{ animationDelay: `${i * 75}ms` }}
        >
          <div className="relative aspect-square overflow-hidden">
            <div className="skeleton-shimmer absolute inset-0 rounded-t-xl" />
          </div>
          <div className="flex flex-1 flex-col gap-2 p-3">
            <div className="skeleton-shimmer h-4 w-3/4 rounded" />
            <div className="skeleton-shimmer h-3 w-1/2 rounded" />
            <div className="mt-auto flex items-center justify-between pt-2">
              <div className="skeleton-shimmer h-5 w-16 rounded" />
              <div className="skeleton-shimmer h-8 w-8 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
