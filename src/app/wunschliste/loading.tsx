// Purpose: Wishlist page loading skeleton
// Docs: PLAN-VERKAUFSFAEHIG.md

export default function WishlistLoading() {
  return (
    <div
      role="status"
      aria-label="Wunschliste wird geladen"
      className="container mx-auto px-4 py-12"
    >
      <div className="mb-8 h-9 w-48 animate-pulse rounded bg-muted" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-lg border border-border bg-card"
          >
            <div className="aspect-square animate-pulse bg-muted" />
            <div className="space-y-2 p-4">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-full animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
