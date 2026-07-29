import { ExternalLink, MessageSquareText } from 'lucide-react'
import { approveEngagementDraft, rejectEngagementDraft } from '@/lib/actions/approvals/engagement'
import type { ApprovalEngagementDraft } from '@/lib/actions/approvals/types'
import { formatDateTime } from '@/lib/format'
import { EmptyState, SectionHeader, StatusPill } from './approval-ui'

export function EngagementApprovalSection({ engagementDrafts }: { engagementDrafts: ApprovalEngagementDraft[] }) {
  return (
    <section className="rounded-2xl border border-border bg-card">
      <SectionHeader
        icon={MessageSquareText}
        title="Social- und Outreach-Entwürfe"
        description="Freigabe bedeutet nur approved. Ein separater, offizieller Channel-Worker übernimmt später die zulässige Zustellung."
      />
      {engagementDrafts.length ? (
        <div className="divide-y divide-border">
          {engagementDrafts.map((draft) => (
            <article key={draft.id} className="px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill value={draft.channel} />
                    <StatusPill value={draft.interactionType} />
                    <span className="text-xs text-muted-foreground">{formatDateTime(draft.createdAt)}</span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{draft.message}</p>
                  {draft.sourceUrl ? (
                    <a
                      href={draft.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      Öffentlichen Kontext prüfen <ExternalLink className="size-3" aria-hidden />
                    </a>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <form action={approveEngagementDraft.bind(null, draft.id)}>
                    <button className="btn btn-primary btn-md" type="submit">Freigeben</button>
                  </form>
                  <form action={rejectEngagementDraft.bind(null, draft.id)}>
                    <button className="btn btn-outline btn-md" type="submit">Ablehnen</button>
                  </form>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState text="Keine Social-Entwürfe warten auf Freigabe." />
      )}
    </section>
  )
}
