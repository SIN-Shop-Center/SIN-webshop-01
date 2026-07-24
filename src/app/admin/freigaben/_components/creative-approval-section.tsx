import { BadgeCheck, CheckCircle2, CircleAlert, Clock3, Film, RotateCcw } from 'lucide-react'
import {
  approveCreativeJob,
  decideCreativeCheckpoint,
  rejectCreativeJob,
} from '@/lib/actions/approvals/creative'
import type { ApprovalCreativeJob } from '@/lib/actions/approvals/types'
import { formatDateTime } from '@/lib/format'
import { CheckpointArtifactPreview } from './checkpoint-artifact-preview'
import { EmptyState, SectionHeader, StatusPill } from './approval-ui'

export function CreativeApprovalSection({ creativeJobs }: { creativeJobs: ApprovalCreativeJob[] }) {
  return (
    <section className="rounded-2xl border border-border bg-card">
      <SectionHeader
        icon={Film}
        title="Creative-Freigabe"
        description="Konzept, Script, Szenenplan, Assets und Export werden als getrennte OpenMontage-Gates geprüft."
      />
      {creativeJobs.length ? (
        <div className="divide-y divide-border">
          {creativeJobs.map((job) => (
            <article key={job.id} className="px-5 py-6 sm:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-semibold">{job.projectId}</h3>
                    <StatusPill value={job.status} />
                    <StatusPill value={`final review: ${job.finalReviewStatus || 'offen'}`} />
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{job.projectPath}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Aktualisiert {formatDateTime(job.updatedAt)}</p>
                </div>
                {!job.openCheckpoint && job.finalReviewStatus === 'pass' && job.renderPath ? (
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <form action={approveCreativeJob.bind(null, job.id)}>
                      <button className="btn btn-primary btn-md" type="submit">
                        <CheckCircle2 className="size-4" aria-hidden />
                        Final freigeben
                      </button>
                    </form>
                    <form action={rejectCreativeJob.bind(null, job.id)}>
                      <button className="btn btn-outline btn-md" type="submit">Ablehnen</button>
                    </form>
                  </div>
                ) : null}
              </div>

              {job.checkpoints.length ? (
                <div className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="Creative-Stufen">
                  {job.checkpoints.map((checkpoint) => {
                    const open = job.openCheckpoint?.stage === checkpoint.stage
                    const complete = checkpoint.status === 'completed' || checkpoint.humanApproved
                    return (
                      <div
                        key={checkpoint.stage}
                        className={`min-w-32 rounded-xl border px-3 py-3 ${
                          open
                            ? 'border-foreground bg-foreground text-background'
                            : complete
                              ? 'border-success/20 bg-success/5'
                              : 'border-border bg-muted/30'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {open ? (
                            <Clock3 className="size-3.5" aria-hidden />
                          ) : complete ? (
                            <CheckCircle2 className="size-3.5 text-success" aria-hidden />
                          ) : (
                            <CircleAlert className="size-3.5 text-muted-foreground" aria-hidden />
                          )}
                          <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">
                            {checkpoint.stage.replace('_', ' ')}
                          </span>
                        </div>
                        <p className={`mt-2 text-[10px] ${open ? 'text-background/70' : 'text-muted-foreground'}`}>
                          {checkpoint.status}
                        </p>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
                  Noch kein OpenMontage-Checkpoint synchronisiert. Der nächste Creative-Worker-Lauf startet oder aktualisiert das Projekt.
                </div>
              )}

              {job.openCheckpoint ? (
                <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-xl border border-border bg-muted/20 p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Offenes Gate
                        </p>
                        <h4 className="mt-1 text-lg font-semibold tracking-tight">
                          {job.openCheckpoint.stage.replace('_', ' ')} prüfen
                        </h4>
                      </div>
                      <StatusPill value={job.openCheckpoint.status} />
                    </div>
                    <CheckpointArtifactPreview checkpoint={job.openCheckpoint} />
                  </div>

                  <form action={decideCreativeCheckpoint} className="rounded-xl border border-border p-4 sm:p-5">
                    <input type="hidden" name="jobId" value={job.id} />
                    <input type="hidden" name="stage" value={job.openCheckpoint.stage} />
                    <div className="flex items-start gap-3">
                      <BadgeCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
                      <div>
                        <h4 className="text-sm font-semibold">Entscheidung</h4>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          Freigabe setzt Codex an der nächsten Stufe fort. Änderungswünsche werden direkt in den lokalen Checkpoint geschrieben.
                        </p>
                      </div>
                    </div>
                    <label className="mt-5 block text-xs font-medium">
                      <span>Feedback oder konkrete Änderungen</span>
                      <textarea
                        name="feedback"
                        rows={7}
                        placeholder="Zum Beispiel: Hook 2 verwenden, Szene 3 ohne Person, Kostenlimit 1,50 €, CTA sachlicher formulieren."
                        className="mt-1.5 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm leading-6 outline-none transition focus:border-foreground"
                      />
                    </label>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <button className="btn btn-primary btn-md" type="submit" name="decision" value="approved">
                        <CheckCircle2 className="size-4" aria-hidden />
                        Stufe freigeben
                      </button>
                      <button className="btn btn-outline btn-md" type="submit" name="decision" value="revision_requested">
                        <RotateCcw className="size-4" aria-hidden />
                        Überarbeiten
                      </button>
                    </div>
                  </form>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState text="Keine Creatives warten auf Freigabe." />
      )}
    </section>
  )
}
