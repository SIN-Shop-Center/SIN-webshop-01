// Purpose: Orders page loading skeleton
// Docs: PLAN-VERKAUFSFAEHIG.md

export default function OrdersLoading() {
  return (
    <div
      role="status"
      aria-label="Bestellungen werden geladen"
      className="container mx-auto max-w-3xl px-4 py-12"
    >
      <div className="mb-8 h-9 w-64 animate-pulse rounded bg-muted" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border p-5">
            <div className="mb-3 flex justify-between">
              <div className="space-y-2">
                <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
            </div>
            <div className="mb-2 h-3 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
