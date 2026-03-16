import { formatDateTime } from '@/lib/utils'
import { formatStatusLabel, statusBadgeClass } from '../supplier-ui'
import type { OnboardingRun } from './types'

type SupplierRunsSectionProps = {
  runs: OnboardingRun[]
  selectedRunID: string | null
  onSelectRun: (runID: string) => void
}

function runTone(status: string) {
  if (status === 'succeeded') return 'success'
  if (status === 'failed' || status === 'cancelled') return 'danger'
  if (status === 'awaiting_human') return 'warning'
  if (status === 'running' || status === 'queued') return 'info'
  return 'neutral'
}

export function SupplierRunsSection({ runs, selectedRunID, onSelectRun }: SupplierRunsSectionProps) {
  return (
    <section className="panel p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl">Letzte Runs</h2>
        <p className="text-sm text-brand-text-muted">{runs.length} Einträge</p>
      </div>

      <div className="mt-4 space-y-2">
        {runs.map((run) => (
          <button
            key={run.id}
            type="button"
            onClick={() => onSelectRun(run.id)}
            className={[
              'w-full rounded-2xl border px-4 py-3 text-left transition',
              selectedRunID === run.id ? 'border-brand-accent bg-brand-bg-muted' : 'border-brand-border bg-white hover:border-brand-accent',
            ].join(' ')}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-xs text-brand-text-muted">{run.id}</p>
              <span className={statusBadgeClass(runTone(run.status))}>{formatStatusLabel(run.status)}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-brand-text-muted">
              <p>Modus: <span className="font-semibold text-brand-text">{run.execution_mode}</span></p>
              <p>Schritte: <span className="font-semibold text-brand-text">{run.steps_count ?? 0}</span></p>
              <p>Aktualisiert: <span className="font-semibold text-brand-text">{run.updated_at ? formatDateTime(run.updated_at) : '—'}</span></p>
            </div>
          </button>
        ))}

        {runs.length === 0 ? (
          <p className="rounded-2xl border border-brand-border bg-brand-bg-muted px-4 py-4 text-sm text-brand-text-muted">
            Noch keine Runs vorhanden.
          </p>
        ) : null}
      </div>
    </section>
  )
}
