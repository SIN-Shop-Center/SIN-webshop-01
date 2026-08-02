import { AlertTriangle, ArrowUpRight, Radio, ShieldCheck, Workflow } from 'lucide-react'
import { getAdminDashboardData } from '@/lib/admin-dashboard/data'
import { formatEuro } from '@/lib/format'
import { AttentionSection } from './_components/attention-section'
import { MetricCard } from './_components/dashboard-ui'
import { OperationsPanels } from './_components/operations-panels'
import { PipelineStageGrid } from './_components/pipeline-stage-grid'
import { QueueOperationButton } from './components/QueueOperationButton'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const { stats, failedOrders, operations, mode } = await getAdminDashboardData()
  const healthIssues = stats.failedCount + operations.failedJobs + operations.openIncidents + operations.warnings.length

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"><Radio className="size-3.5" aria-hidden />{mode === 'mock' ? 'Local Preview' : 'Live Operations'}</div>
          <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Autonomous Commerce Control</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">Ein durchgängiger Arbeitsbereich für Trends, CJ-Sourcing, Datenqualität, Creatives, Shop-Publishing, TikTok und Social Distribution.</p>
        </div>
        <div className="flex flex-wrap gap-2"><QueueOperationButton operation="trend.scan" label="Trend-Scan starten" variant="outline" disabledReason={mode === 'mock' ? 'Im Local Preview sind Schreibaktionen deaktiviert.' : undefined} /><QueueOperationButton operation="pipeline.daily" label="Tagespipeline starten" disabledReason={mode === 'mock' ? 'Im Local Preview sind Schreibaktionen deaktiviert.' : undefined} /></div>
      </header>

      {mode === 'mock' ? (
        <aside role="status" className="rounded-2xl border border-accent/25 bg-accent/5 px-5 py-4 text-sm">
          <p className="font-semibold">Lokaler Dashboard-Preview</p>
          <p className="mt-1 text-muted-foreground">Alle Kennzahlen sind deterministische Beispieldaten. Authentifizierung, Queue-Schreibzugriffe und externe Anbieteraufrufe bleiben deaktiviert.</p>
        </aside>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Kennzahlen">
        <MetricCard label="Umsatz gesamt" value={formatEuro(stats.revenueCents)} detail={`${stats.orderCount} Bestellungen`} icon={ArrowUpRight} />
        <MetricCard label="Pipeline aktiv" value={String(operations.queuedJobs)} detail="wartend oder in Bearbeitung" icon={Workflow} />
        <MetricCard label="Handlungsbedarf" value={String(healthIssues)} detail="Fehler, Incidents oder Konfiguration" icon={AlertTriangle} danger={healthIssues > 0} />
        <MetricCard label="Fulfillment" value={String(stats.shippedCount)} detail={`${stats.forwardedCount} an CJ weitergeleitet`} icon={ShieldCheck} />
      </section>

      <PipelineStageGrid stages={operations.stages} />
      <OperationsPanels jobs={operations.recentJobs} channels={operations.channels} />
      <AttentionSection failedOrders={failedOrders} warnings={operations.warnings} />
    </div>
  )
}
