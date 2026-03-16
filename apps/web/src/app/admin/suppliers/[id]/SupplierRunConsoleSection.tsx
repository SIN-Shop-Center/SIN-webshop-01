import { formatDateTime } from '@/lib/utils'
import { formatStatusLabel, statusBadgeClass } from '../supplier-ui'
import type { RunDetail } from './types'

type SupplierRunConsoleSectionProps = {
  runDetail: RunDetail | null
}

function stepTone(status?: string) {
  if (status === 'succeeded') return 'success'
  if (status === 'failed' || status === 'cancelled') return 'danger'
  if (status === 'awaiting_human') return 'warning'
  if (status === 'running') return 'info'
  return 'neutral'
}

export function SupplierRunConsoleSection({ runDetail }: SupplierRunConsoleSectionProps) {
  return (
    <section className="panel p-5 xl:col-span-2">
      <h2 className="text-xl">Run-Konsole</h2>
      {!runDetail ? (
        <p className="mt-2 text-sm text-brand-text-muted">Run auswählen, um Schritte und Aktivitäten zu sehen.</p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-border bg-brand-bg-muted px-4 py-3">
            <div>
              <p className="font-mono text-xs text-brand-text-muted">{runDetail.id}</p>
              <p className="mt-1 text-sm text-brand-text-muted">
                Modus {runDetail.execution_mode} · gestartet {runDetail.started_at ? formatDateTime(runDetail.started_at) : '—'}
              </p>
            </div>
            <span className={statusBadgeClass(stepTone(runDetail.status))}>{formatStatusLabel(runDetail.status)}</span>
          </div>

          {runDetail.last_error ? (
            <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{runDetail.last_error}</p>
          ) : null}

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <article className="rounded-2xl border border-brand-border p-4">
              <h3 className="text-sm font-semibold text-brand-text">Schritte</h3>
              <div className="mt-3 space-y-3">
                {(runDetail.steps || []).map((step) => (
                  <div key={step.id} className="rounded-2xl border border-brand-border bg-brand-bg-muted px-3 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-brand-text">
                        #{step.step_order} {formatStatusLabel(step.step_type)}
                      </p>
                      <span className={statusBadgeClass(stepTone(step.status))}>{formatStatusLabel(step.status)}</span>
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-brand-text-muted">
                      <p>Versuche: <span className="font-semibold text-brand-text">{step.attempt_count ?? 0}</span></p>
                      <p>Zuletzt geändert: <span className="font-semibold text-brand-text">{step.updated_at ? formatDateTime(step.updated_at) : '—'}</span></p>
                      {step.error_message ? <p className="text-red-700">Fehler: {step.error_message}</p> : null}
                      {(step.artifact_urls || []).length > 0 ? (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {step.artifact_urls?.map((url) => (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-brand-border bg-white px-2.5 py-1 text-xs font-semibold text-brand-text hover:border-brand-accent"
                            >
                              Artefakt
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
                {(runDetail.steps || []).length === 0 ? <p className="text-sm text-brand-text-muted">Keine Schritte protokolliert.</p> : null}
              </div>
            </article>

            <article className="rounded-2xl border border-brand-border p-4">
              <h3 className="text-sm font-semibold text-brand-text">Aktivitätslog</h3>
              <div className="mt-3 space-y-3">
                {(runDetail.activity || []).map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-brand-border bg-brand-bg-muted px-3 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-brand-text">{formatStatusLabel(entry.activity_type)}</p>
                      <span className={statusBadgeClass(stepTone(entry.severity))}>{formatStatusLabel(entry.severity)}</span>
                    </div>
                    <p className="mt-2 text-sm text-brand-text">{entry.message}</p>
                    <p className="mt-1 text-xs text-brand-text-muted">{entry.created_at ? formatDateTime(entry.created_at) : '—'}</p>
                  </div>
                ))}
                {(runDetail.activity || []).length === 0 ? <p className="text-sm text-brand-text-muted">Keine Aktivitäten protokolliert.</p> : null}
              </div>
            </article>
          </div>
        </>
      )}
    </section>
  )
}
