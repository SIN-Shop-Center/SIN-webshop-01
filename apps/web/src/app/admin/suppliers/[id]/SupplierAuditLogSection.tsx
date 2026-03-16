import { History } from 'lucide-react'
import { useMemo } from 'react'
import type { SupplierAuditLogEntry } from './types'

type SupplierAuditLogSectionProps = {
  entries: SupplierAuditLogEntry[]
}

function pretty(value: unknown) {
  if (value === undefined || value === null) return '-'
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function safeDateLabel(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('de-DE')
}

export function SupplierAuditLogSection({ entries }: SupplierAuditLogSectionProps) {
  const sorted = useMemo(() => {
    return [...entries].sort((a, b) => {
      const at = a.created_at ? new Date(a.created_at).getTime() : 0
      const bt = b.created_at ? new Date(b.created_at).getTime() : 0
      return bt - at
    })
  }, [entries])

  return (
    <section className="panel p-5 xl:col-span-2">
      <div className="flex items-start gap-3">
        <span className="rounded-full bg-brand-bg-muted p-2 text-brand-text">
          <History className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-xl">Audit Trail</h2>
          <p className="mt-1 text-sm text-brand-text-muted">Vorher/Nachher Snapshots fuer Admin-Mutationen.</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {sorted.map((entry) => (
          <details key={entry.id} className="rounded-2xl border border-brand-border bg-white px-4 py-3">
            <summary className="cursor-pointer list-none">
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-brand-text">{entry.action}</p>
                  <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-brand-text-muted">
                    <span>
                      {entry.entity_type}
                      {entry.entity_id ? `:${entry.entity_id}` : ''}
                    </span>
                    <span>{safeDateLabel(entry.created_at)}</span>
                    {entry.actor_role ? <span>role: {entry.actor_role}</span> : null}
                    {entry.actor_id ? <span>actor: {entry.actor_id.slice(0, 12)}…</span> : null}
                    {entry.request_id ? <span>req: {entry.request_id.slice(0, 12)}…</span> : null}
                  </p>
                </div>
              </div>
            </summary>

            <div className="mt-3 grid gap-3 xl:grid-cols-2">
              <div>
                <p className="text-xs font-semibold text-brand-text-muted">Before</p>
                <pre className="mt-1 max-h-80 overflow-auto rounded-xl border border-brand-border bg-brand-bg-muted px-3 py-2 text-xs text-brand-text">
                  {pretty(entry.before)}
                </pre>
              </div>
              <div>
                <p className="text-xs font-semibold text-brand-text-muted">After</p>
                <pre className="mt-1 max-h-80 overflow-auto rounded-xl border border-brand-border bg-brand-bg-muted px-3 py-2 text-xs text-brand-text">
                  {pretty(entry.after)}
                </pre>
              </div>
            </div>

            <div className="mt-3">
              <p className="text-xs font-semibold text-brand-text-muted">Metadata</p>
              <pre className="mt-1 max-h-60 overflow-auto rounded-xl border border-brand-border bg-brand-bg-muted px-3 py-2 text-xs text-brand-text">
                {pretty(entry.metadata)}
              </pre>
            </div>
          </details>
        ))}

        {sorted.length === 0 ? (
          <p className="rounded-2xl border border-brand-border bg-brand-bg-muted px-4 py-4 text-sm text-brand-text-muted">
            Keine Audit-Eintraege vorhanden.
          </p>
        ) : null}
      </div>
    </section>
  )
}
