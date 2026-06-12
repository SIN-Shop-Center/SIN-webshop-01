// Purpose: Search page loading skeleton
// Docs: PLAN-VERKAUFSFAEHIG.md

export default function SucheLoading() {
  return (
    <div
      role="status"
      aria-label="Suche wird geladen"
      className="container mx-auto max-w-6xl px-4 py-8"
    >
      <div className="mb-1 h-8 w-64 animate-pulse rounded bg-muted" />
      <div className="mb-6 h-4 w-32 animate-pulse rounded bg-muted" />
      <div className="flex flex-col gap-8 md:flex-row">
        <aside className="md:w-56 md:shrink-0">
          <div className="flex flex-col gap-4">
            <div className="h-10 animate-pulse rounded bg-muted" />
            <div className="h-10 animate-pulse rounded bg-muted" />
            <div className="h-10 animate-pulse rounded bg-muted" />
          </div>
        </aside>
        <div className="flex-1">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3 rounded-lg border border-border p-3">
                <div className="aspect-square animate-pulse rounded-md bg-muted" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-5 w-1/3 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
