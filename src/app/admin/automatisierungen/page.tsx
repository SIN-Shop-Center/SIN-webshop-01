import { Workflow } from 'lucide-react'
import { getOperationsOverview } from '@/lib/actions/operations/overview'
import { QueueOperationButton } from '../components/QueueOperationButton'
import { AutomationHistory } from './_components/automation-history'
import { AutomationOperationGrid } from './_components/automation-operation-grid'
import { AutomationSummary, AutomationWarnings } from './_components/automation-summary'

export const dynamic = 'force-dynamic'

export default async function AutomationsPage() {
  const overview = await getOperationsOverview()

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <Workflow className="size-3.5" aria-hidden /> Automation Runtime
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.035em]">Automatisierungen</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            Ein kontrollierter Ablauf mit echten Queues, Retry-Status, Freigaben und Audit-Spuren.
            Jeder Agent hat einen klaren Input, Output und Verantwortungsbereich.
          </p>
        </div>
        <QueueOperationButton operation="pipeline.daily" label="Komplette Tagespipeline" />
      </header>

      <AutomationSummary queuedJobs={overview.queuedJobs} failedJobs={overview.failedJobs} openIncidents={overview.openIncidents} />
      <AutomationOperationGrid stages={overview.stages} />
      <AutomationHistory jobs={overview.recentJobs} />
      <AutomationWarnings warnings={overview.warnings} />
    </div>
  )
}
