import type { QueueJobSnapshot } from '@/lib/actions/operations/types'
import { formatDateTime } from '@/lib/format'

export function AutomationHistory({ jobs }: { jobs: QueueJobSnapshot[] }) {
  return (
    <section className="rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4 sm:px-6">
        <h2 className="font-semibold tracking-tight">Ausführungshistorie</h2>
        <p className="mt-1 text-xs text-muted-foreground">Die lokale Worker-Runtime beansprucht Jobs atomar und schreibt Fehler zurück.</p>
      </div>
      {jobs.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
              <th className="px-6 py-3 font-medium">Operation</th><th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Versuche</th><th className="px-6 py-3 font-medium">Erstellt</th>
              <th className="px-6 py-3 font-medium">Letzter Fehler</th>
            </tr></thead>
            <tbody>{jobs.map((job) => (
              <tr key={job.id} className="border-b border-border last:border-0">
                <td className="px-6 py-4 font-medium">{job.jobType}</td><td className="px-6 py-4">{job.status}</td>
                <td className="px-6 py-4 tabular-nums">{job.attempts}/{job.maxAttempts}</td>
                <td className="px-6 py-4 text-muted-foreground">{formatDateTime(job.createdAt)}</td>
                <td className="max-w-80 truncate px-6 py-4 text-xs text-destructive">{job.lastError ?? '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <div className="px-6 py-12 text-center text-sm text-muted-foreground">Noch keine Jobs vorhanden.</div>}
    </section>
  )
}
