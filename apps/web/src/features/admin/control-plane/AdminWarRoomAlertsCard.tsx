'use client'

import Link from '@/components/ui/Link'
import { AlertTriangle } from 'lucide-react'
import type { AlertRecord } from '@/features/admin/types'

function toneClasses(triggered: boolean) {
  return triggered ? 'border-red-200 bg-red-50 text-red-900' : 'border-brand-border bg-brand-surface text-brand-text'
}

export function AdminWarRoomAlertsCard({
  loading,
  error,
  alerts,
}: {
  loading: boolean
  error: boolean
  alerts: AlertRecord[]
}) {
  return (
    <article className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl">
          <AlertTriangle className="h-5 w-5 text-brand-accent" />
          War-Room Alerts
        </h2>
        <Link href="/admin/analytics" className="text-sm font-semibold text-brand-accent hover:underline">
          Details ansehen
        </Link>
      </div>
      {loading ? <p className="mt-4 text-sm text-brand-text-muted">Lade Alerts…</p> : null}
      {error ? (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">Analytics-Daten konnten nicht geladen werden.</p>
      ) : null}
      <div className="mt-4 space-y-3">
        {alerts.slice(0, 5).map((alert) => (
          <div key={alert.name} className={`rounded-2xl border px-4 py-3 ${toneClasses(alert.triggered)}`}>
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">{alert.name}</p>
              <span className="text-xs font-semibold uppercase tracking-[0.12em]">{alert.triggered ? 'Aktiv' : 'Beobachten'}</span>
            </div>
            <p className="mt-2 text-sm opacity-90">{alert.reason}</p>
          </div>
        ))}
        {!loading && !error && alerts.length === 0 ? (
          <div className="rounded-2xl border border-brand-border bg-white px-4 py-4 text-sm text-brand-text-muted">
            Keine aktiven Alerts im aktuellen Zeitfenster.
          </div>
        ) : null}
      </div>
    </article>
  )
}

