'use client'

export function ProductSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-brand-border bg-white/85 shadow-[0_10px_28px_rgba(10,10,10,0.07)] animate-pulse">
      <div className="aspect-[4/3] bg-brand-bg-muted" />
      <div className="space-y-3 p-4">
        <div className="h-3 w-20 rounded bg-brand-bg-muted" />
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-brand-bg-muted" />
          <div className="h-4 w-3/4 rounded bg-brand-bg-muted" />
        </div>
        <div className="h-7 w-28 rounded bg-brand-bg-muted" />
        <div className="h-10 w-full rounded-full bg-brand-bg-muted" />
      </div>
    </div>
  )
}

export function ProductDetailSkeleton() {
  return (
    <div className="grid animate-pulse gap-8 md:grid-cols-2 lg:gap-12">
      <div className="space-y-4">
        <div className="aspect-square rounded-3xl bg-brand-bg-muted" />
        <div className="grid grid-cols-4 gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-brand-bg-muted" />
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="h-4 w-24 rounded bg-brand-bg-muted" />
        <div className="space-y-2">
          <div className="h-8 w-3/4 rounded bg-brand-bg-muted" />
          <div className="h-8 w-1/2 rounded bg-brand-bg-muted" />
        </div>
        <div className="h-10 w-32 rounded bg-brand-bg-muted" />
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-brand-bg-muted" />
          <div className="h-4 w-full rounded bg-brand-bg-muted" />
          <div className="h-4 w-2/3 rounded bg-brand-bg-muted" />
        </div>
        <div className="flex gap-4">
          <div className="h-12 w-32 rounded-full bg-brand-bg-muted" />
          <div className="h-12 flex-1 rounded-full bg-brand-bg-muted" />
        </div>
      </div>
    </div>
  )
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {[...Array(count)].map((_, i) => (
        <ProductSkeleton key={i} />
      ))}
    </div>
  )
}
