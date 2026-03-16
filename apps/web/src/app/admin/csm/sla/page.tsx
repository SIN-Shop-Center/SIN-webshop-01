'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Clock3, Siren } from 'lucide-react'
import { getAuthHeaders } from '@/lib/api/auth'

type CRMTask = Record<string, unknown>

type TaskListResponse = {
  success?: boolean
  data?: {
    items?: CRMTask[]
  }
}

export default function AdminCSMSLAPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openTasks, setOpenTasks] = useState<CRMTask[]>([])
  const [breachTasks, setBreachTasks] = useState<CRMTask[]>([])

  useEffect(() => {
    let active = true
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch('/api/admin/crm/tasks?status=open&limit=100', {
          cache: 'no-store',
          headers: await getAuthHeaders(),
        })
        if (!response.ok) {
          throw new Error(`sla_tasks_fetch_failed:${response.status}`)
        }
        const payload = (await response.json()) as TaskListResponse
        const items = payload.data?.items || []
        const now = Date.now()
        const breaches = items.filter((item) => {
          const dueAt = item.due_at ? Date.parse(String(item.due_at)) : NaN
          return Number.isFinite(dueAt) && dueAt < now
        })
        if (!active) return
        setOpenTasks(items)
        setBreachTasks(breaches)
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'sla_tasks_fetch_failed')
      } finally {
        if (active) setLoading(false)
      }
    }
    void run()
    return () => {
      active = false
    }
  }, [])

  return (
    <main className="pb-10">
      <header className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-text-muted">CSM</p>
        <h1 className="mt-1 text-4xl">SLA Monitor</h1>
        <p className="mt-2 text-brand-text-muted">
          Offene CRM-Tasks mit Fokus auf überfällige Reaktions- und Lösungszeiten.
        </p>
      </header>

      {error ? <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {loading ? <p className="text-sm text-brand-text-muted">Lade SLA-Daten…</p> : null}

      {!loading ? (
        <section className="grid gap-4 md:grid-cols-3">
          <article className="panel p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-brand-text-muted">
              <Clock3 className="h-4 w-4 text-brand-accent" />
              Open Tasks
            </p>
            <p className="mt-2 text-3xl font-semibold">{openTasks.length}</p>
          </article>
          <article className="panel p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-brand-text-muted">
              <Siren className="h-4 w-4 text-red-600" />
              SLA Breaches
            </p>
            <p className="mt-2 text-3xl font-semibold text-red-700">{breachTasks.length}</p>
          </article>
          <article className="panel p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-brand-text-muted">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Breach Rate
            </p>
            <p className="mt-2 text-3xl font-semibold">
              {openTasks.length === 0 ? '0%' : `${Math.round((breachTasks.length / openTasks.length) * 100)}%`}
            </p>
          </article>
        </section>
      ) : null}

      {!loading ? (
        <section className="mt-6 panel p-5">
          <h2 className="text-xl">Überfällige Tasks</h2>
          <div className="mt-3 space-y-2">
            {breachTasks.slice(0, 20).map((item) => (
              <article key={String(item.id)} className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                <p className="font-semibold">{String(item.title || 'Task')}</p>
                <p>
                  Entity: {String(item.entity_type || 'entity')}:{String(item.entity_id || '')}
                </p>
                <p>Due: {String(item.due_at || '—')}</p>
              </article>
            ))}
            {breachTasks.length === 0 ? (
              <p className="text-sm text-brand-text-muted">Keine SLA-Verletzungen vorhanden.</p>
            ) : null}
          </div>
        </section>
      ) : null}
    </main>
  )
}
