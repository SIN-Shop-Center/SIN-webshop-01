'use client'

import { ADMIN_OPERATION_SURFACES } from '@/features/admin/constants'

type AdminHubHeaderProps = {
  workspacesCount: number
  triggeredAlertsCount: number
  healthySystemsCount: number
  systemsCount: number
}

export function AdminHubHeader({
  workspacesCount,
  triggeredAlertsCount,
  healthySystemsCount,
  systemsCount,
}: AdminHubHeaderProps) {
  return (
    <section className="panel-elevated overflow-hidden">
      <div className="border-b border-brand-border bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.14),transparent_34%),linear-gradient(145deg,rgba(255,255,255,0.96),rgba(243,240,234,0.82))] px-6 py-6">
        <p className="section-eyebrow">Operations Hub</p>
        <h1 className="mt-2 text-4xl">Ein täglicher Arbeitsmodus statt lose Admin-Screens.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-brand-text-muted">
          Die wichtigsten Wege liegen vorne: Performance lesen, Channels steuern, Supplier operativ halten, CRM priorisieren und
          UGC-Produktion starten. Datenflächen bleiben verfügbar, dominieren aber nicht mehr die Oberfläche.
        </p>
      </div>

      <div className="grid gap-4 px-6 py-6 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-brand-border bg-white px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-text-muted">Workspaces live</p>
          <p className="mt-2 text-3xl font-semibold text-brand-text">{workspacesCount}</p>
          <p className="mt-2 text-sm text-brand-text-muted">fokussierte Produktflächen für tägliche Ops</p>
        </article>
        <article className="rounded-2xl border border-brand-border bg-white px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-text-muted">Alerts aktiv</p>
          <p className="mt-2 text-3xl font-semibold text-brand-text">{triggeredAlertsCount}</p>
          <p className="mt-2 text-sm text-brand-text-muted">kritische Signale aus dem War-Room</p>
        </article>
        <article className="rounded-2xl border border-brand-border bg-white px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-text-muted">Systeme gesund</p>
          <p className="mt-2 text-3xl font-semibold text-brand-text">
            {healthySystemsCount}/{systemsCount}
          </p>
          <p className="mt-2 text-sm text-brand-text-muted">Web- und Analytics-Signale auf einen Blick</p>
        </article>
        <article className="rounded-2xl border border-brand-border bg-white px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-text-muted">Operative Datenflächen</p>
          <p className="mt-2 text-3xl font-semibold text-brand-text">{ADMIN_OPERATION_SURFACES.length}</p>
          <p className="mt-2 text-sm text-brand-text-muted">schnelle Tabellen- und Monitoring-Views im Hintergrund</p>
        </article>
      </div>
    </section>
  )
}

