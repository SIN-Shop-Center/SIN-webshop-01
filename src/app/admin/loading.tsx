// Purpose: Admin dashboard loading skeleton
// Docs: PLAN-VERKAUFSFAEHIG.md

export default function AdminLoading() {
  return (
    <div
      role="status"
      aria-label="Admin wird geladen"
      className="flex flex-col gap-8"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border p-6"
          >
            <div className="mb-2 h-3 w-24 animate-pulse rounded bg-muted" />
            <div className="h-7 w-16 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-lg bg-muted"
          />
        ))}
      </div>
    </div>
  )
}
