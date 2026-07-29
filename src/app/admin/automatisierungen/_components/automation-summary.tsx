import { Bot, CircleAlert, ShieldCheck, type LucideIcon } from 'lucide-react'

function SummaryCard({ label, value, icon: Icon, danger = false }: {
  label: string
  value: number
  icon: LucideIcon
  danger?: boolean
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Icon className={`size-4 ${danger ? 'text-destructive' : 'text-muted-foreground'}`} aria-hidden />
      </div>
      <p className={`mt-5 text-3xl font-semibold tabular-nums ${danger ? 'text-destructive' : ''}`}>{value}</p>
    </div>
  )
}

export function AutomationSummary({ queuedJobs, failedJobs, openIncidents }: {
  queuedJobs: number
  failedJobs: number
  openIncidents: number
}) {
  return (
    <section className="grid gap-3 sm:grid-cols-3">
      <SummaryCard label="Aktive Jobs" value={queuedJobs} icon={Bot} />
      <SummaryCard label="Fehlgeschlagen" value={failedJobs} icon={CircleAlert} danger={failedJobs > 0} />
      <SummaryCard label="Offene Incidents" value={openIncidents} icon={ShieldCheck} danger={openIncidents > 0} />
    </section>
  )
}

export function AutomationWarnings({ warnings }: { warnings: string[] }) {
  if (!warnings.length) return null
  return (
    <section className="rounded-2xl border border-accent/20 bg-accent/5 p-5">
      <div className="flex items-start gap-3">
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
        <div><h2 className="text-sm font-semibold">Konfiguration oder Migration fehlt</h2>
          <ul className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground">
            {warnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        </div>
      </div>
    </section>
  )
}
