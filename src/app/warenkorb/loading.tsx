// Purpose: Cart page loading skeleton
// Docs: PLAN-VERKAUFSFAEHIG.md

export default function CartLoading() {
  return (
    <div
      role="status"
      aria-label="Warenkorb wird geladen"
      className="container mx-auto px-4 py-12"
    >
      <div className="mb-8 h-9 w-48 animate-pulse rounded bg-muted" />
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex gap-4 rounded-lg border border-border p-4"
            >
              <div className="size-24 animate-pulse rounded-md bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                <div className="h-8 w-40 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
        <div className="h-fit space-y-3 rounded-lg border border-border p-6">
          <div className="h-5 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-3 w-full animate-pulse rounded bg-muted" />
          <div className="h-3 w-full animate-pulse rounded bg-muted" />
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  )
}
