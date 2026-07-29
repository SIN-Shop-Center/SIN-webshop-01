import { CircleDashed, Clock3 } from 'lucide-react'
import type { ChannelSnapshot, QueueJobSnapshot } from '@/lib/actions/operations/types'
import { formatDateTime } from '@/lib/format'
import { EmptyState, JobStatus } from './dashboard-ui'

function RecentJobs({ jobs }: { jobs: QueueJobSnapshot[] }) {
  return (
    <section className="rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
        <div><h2 className="font-semibold tracking-tight">Letzte Pipeline-Jobs</h2><p className="mt-1 text-xs text-muted-foreground">Queue: commerce-autopilot</p></div>
        <CircleDashed className="size-4 text-muted-foreground" aria-hidden />
      </div>
      {jobs.length ? <div className="divide-y divide-border">{jobs.map((job) => (
        <div key={job.id} className="flex items-center gap-4 px-5 py-4 sm:px-6">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-muted/40"><Clock3 className="size-4 text-muted-foreground" aria-hidden /></div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{job.jobType}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(job.createdAt)} · Versuch {job.attempts}/{job.maxAttempts}</p>
            {job.lastError ? <p className="mt-1 truncate text-xs text-destructive">{job.lastError}</p> : null}
          </div>
          <JobStatus status={job.status} />
        </div>
      ))}</div> : <EmptyState text="Noch keine Jobs in der neuen Pipeline." />}
    </section>
  )
}

function Channels({ channels }: { channels: ChannelSnapshot[] }) {
  return (
    <section className="rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4"><h2 className="font-semibold tracking-tight">Channels</h2><p className="mt-1 text-xs text-muted-foreground">Verbindungen und API-Zustand</p></div>
      {channels.length ? <div className="divide-y divide-border">{channels.map((channel) => (
        <div key={channel.channel} className="flex items-center justify-between gap-4 px-5 py-4">
          <div><p className="text-sm font-medium capitalize">{channel.channel.replace('_', ' ')}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{channel.lastHealthAt ? formatDateTime(channel.lastHealthAt) : 'Noch kein Health-Check'}</p>
          </div>
          <span className={`flex items-center gap-1.5 text-xs font-medium ${channel.status === 'connected' ? 'text-success' : 'text-muted-foreground'}`}>
            <span className={`size-1.5 rounded-full ${channel.status === 'connected' ? 'bg-success' : 'bg-muted-foreground'}`} />{channel.status}
          </span>
        </div>
      ))}</div> : <EmptyState text="Channel-Tabelle noch nicht verfügbar." />}
    </section>
  )
}

export function OperationsPanels({ jobs, channels }: { jobs: QueueJobSnapshot[]; channels: ChannelSnapshot[] }) {
  return <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]"><RecentJobs jobs={jobs} /><Channels channels={channels} /></div>
}
