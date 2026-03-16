import type { SupplierPerformance } from './types'

type SupplierPerformanceSectionProps = {
  performance: SupplierPerformance | null
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function formatMinutes(seconds: unknown): string {
  const value = asNumber(seconds)
  if (value <= 0) {
    return '—'
  }
  return `${Math.round(value / 60)} min`
}

function formatPercent(rate: unknown): string {
  const value = asNumber(rate)
  if (value <= 0) {
    return '0%'
  }
  return `${Math.round(value * 100)}%`
}

export function SupplierPerformanceSection({ performance }: SupplierPerformanceSectionProps) {
  const windowDays = performance?.window_days ?? 30
  const metrics = performance?.metrics || {}

  const total = asNumber(metrics.total)
  const placed = asNumber(metrics.placed)
  const failed = asNumber(metrics.failed)
  const dispatching = asNumber(metrics.dispatching)
  const pending = asNumber(metrics.pending)
  const cancelled = asNumber(metrics.cancelled)

  return (
    <section className="panel p-5 xl:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl">Performance</h2>
          <p className="mt-1 text-sm text-brand-text-muted">Supplier-Orders der letzten {windowDays} Tage.</p>
        </div>
        <div className="rounded-full border border-brand-border bg-white px-3 py-1 text-sm font-semibold text-brand-text">
          Total: {total}
        </div>
      </div>

      {!performance ? (
        <p className="mt-3 text-sm text-brand-text-muted">Noch keine Daten vorhanden.</p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-brand-border bg-white p-4">
            <p className="text-sm font-semibold text-brand-text">On-time</p>
            <p className="mt-2 text-3xl text-brand-text">{formatPercent(metrics.on_time_rate)}</p>
            <p className="mt-1 text-sm text-brand-text-muted">bezogen auf platzierte Orders</p>
          </article>

          <article className="rounded-2xl border border-brand-border bg-white p-4">
            <p className="text-sm font-semibold text-brand-text">Ø Placement</p>
            <p className="mt-2 text-3xl text-brand-text">{formatMinutes(metrics.avg_place_latency_seconds)}</p>
            <p className="mt-1 text-sm text-brand-text-muted">dispatching → placed</p>
          </article>

          <article className="rounded-2xl border border-brand-border bg-white p-4">
            <p className="text-sm font-semibold text-brand-text">p95 Placement</p>
            <p className="mt-2 text-3xl text-brand-text">{formatMinutes(metrics.p95_place_latency_seconds)}</p>
            <p className="mt-1 text-sm text-brand-text-muted">dispatching → placed</p>
          </article>

          <article className="rounded-2xl border border-brand-border bg-white p-4">
            <p className="text-sm font-semibold text-brand-text">Status</p>
            <div className="mt-2 grid gap-1 text-sm text-brand-text-muted">
              <p>Placed: <span className="font-semibold text-brand-text">{placed}</span></p>
              <p>Failed: <span className="font-semibold text-brand-text">{failed}</span></p>
              <p>Dispatching: <span className="font-semibold text-brand-text">{dispatching}</span></p>
              <p>Pending: <span className="font-semibold text-brand-text">{pending}</span></p>
              <p>Cancelled: <span className="font-semibold text-brand-text">{cancelled}</span></p>
            </div>
          </article>
        </div>
      )}
    </section>
  )
}
