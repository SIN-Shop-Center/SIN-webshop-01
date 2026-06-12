// Purpose: Category page loading skeleton
// Docs: PLAN-VERKAUFSFAEHIG.md

export default function KategorieLoading() {
  return (
    <div
      role="status"
      aria-label="Kategorie wird geladen"
      className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
    >
      <div className="pb-4">
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
      </div>
      <div className="pb-6">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="mt-2 h-4 w-24 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="aspect-square animate-pulse rounded-lg bg-muted" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-5 w-1/3 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
