import { BadgeCheck, Film, MessageSquareText, PackageCheck } from 'lucide-react'
import { getApprovalQueue } from '@/lib/actions/approvals/queue'
import { QueueMetric } from './_components/approval-ui'
import { CreativeApprovalSection } from './_components/creative-approval-section'
import { EngagementApprovalSection } from './_components/engagement-approval-section'
import { ProductApprovalSection } from './_components/product-approval-section'

export const dynamic = 'force-dynamic'

export default async function ApprovalsPage() {
  const queue = await getApprovalQueue()

  return (
    <div className="space-y-8">
      <header className="max-w-3xl">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          <BadgeCheck className="size-3.5" aria-hidden />
          Human Review
        </div>
        <h1 className="text-3xl font-semibold tracking-[-0.035em]">Freigaben</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
          Hier enden die autonomen Schritte. Produktdaten, GPSR, Creatives und direkte
          Kommunikation werden erst nach einer nachvollziehbaren Prüfung freigegeben.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <QueueMetric label="Produkte" value={queue.products.length} icon={PackageCheck} />
        <QueueMetric label="Creatives" value={queue.creativeJobs.length} icon={Film} />
        <QueueMetric label="Social-Entwürfe" value={queue.engagementDrafts.length} icon={MessageSquareText} />
      </section>

      <ProductApprovalSection products={queue.products} />
      <CreativeApprovalSection creativeJobs={queue.creativeJobs} />
      <EngagementApprovalSection engagementDrafts={queue.engagementDrafts} />
    </div>
  )
}
