import { CheckCircle2, CircleAlert } from 'lucide-react'
import type { PipelineStageSnapshot } from '@/lib/actions/operations/types'
import { QueueOperationButton } from '../../components/QueueOperationButton'
import { AUTOMATIONS } from './automation-catalog'

export function AutomationOperationGrid({ stages }: { stages: PipelineStageSnapshot[] }) {
  const stageMap = new Map(stages.map((stage) => [stage.id, stage]))

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      {AUTOMATIONS.map((operation, index) => {
        const snapshot = stageMap.get(operation.id)
        const Icon = operation.icon
        return (
          <article key={operation.id} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-muted/40">
                <Icon className="size-4.5" strokeWidth={1.8} aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Schritt {String(index + 1).padStart(2, '0')}</p>
                    <h2 className="mt-1 text-lg font-semibold tracking-tight">{operation.title}</h2>
                  </div>
                  <span className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium tabular-nums">
                    {snapshot?.count ?? 0} offen
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{operation.description}</p>
                <dl className="mt-5 grid gap-3 border-y border-border py-4 text-xs sm:grid-cols-2">
                  <div><dt className="font-medium text-muted-foreground">Ergebnis</dt><dd className="mt-1 leading-5">{operation.output}</dd></div>
                  <div><dt className="font-medium text-muted-foreground">Freigabe</dt><dd className="mt-1 leading-5">{operation.approval}</dd></div>
                </dl>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {snapshot?.status === 'ready' ? <CheckCircle2 className="size-3.5 text-success" aria-hidden /> : <CircleAlert className="size-3.5" aria-hidden />}
                    Status: {snapshot?.status ?? 'unbekannt'}
                  </span>
                  <QueueOperationButton operation={operation.id} label="Einplanen" variant="outline" />
                </div>
              </div>
            </div>
          </article>
        )
      })}
    </section>
  )
}
