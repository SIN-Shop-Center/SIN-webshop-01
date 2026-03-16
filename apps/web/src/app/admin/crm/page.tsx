'use client'

import { useEffect, useState } from 'react'
import Link from '@/components/ui/Link'
import { CheckCircle2, ListTodo, MessageSquareText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getAuthHeaders } from '@/lib/api/auth'

type CRMItem = Record<string, unknown>

type ListPayload = {
  success?: boolean
  data?: {
    items?: CRMItem[]
  }
}

export default function AdminCRMPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tasks, setTasks] = useState<CRMItem[]>([])
  const [activities, setActivities] = useState<CRMItem[]>([])
  const [notes, setNotes] = useState<CRMItem[]>([])

  useEffect(() => {
    let active = true
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const headers = await getAuthHeaders()
        const [tasksRes, activitiesRes, notesRes] = await Promise.all([
          fetch('/api/admin/crm/tasks?limit=20', { cache: 'no-store', headers }),
          fetch('/api/admin/crm/activities?limit=20', { cache: 'no-store', headers }),
          fetch('/api/admin/crm/notes?limit=20', { cache: 'no-store', headers }),
        ])
        if (!tasksRes.ok || !activitiesRes.ok || !notesRes.ok) {
          throw new Error(`crm_load_failed:${tasksRes.status}/${activitiesRes.status}/${notesRes.status}`)
        }
        const [tasksPayload, activitiesPayload, notesPayload] = (await Promise.all([
          tasksRes.json(),
          activitiesRes.json(),
          notesRes.json(),
        ])) as [ListPayload, ListPayload, ListPayload]

        if (!active) return
        setTasks(tasksPayload.data?.items || [])
        setActivities(activitiesPayload.data?.items || [])
        setNotes(notesPayload.data?.items || [])
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'crm_load_failed')
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
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-text-muted">Mini CRM</p>
        <h1 className="mt-1 text-4xl">CRM & CSM Hub</h1>
        <p className="mt-2 text-brand-text-muted">
          Tasks, Aktivitäten und Notes für Supplier-, Customer- und Support-Prozesse.
        </p>
      </header>

      {error ? <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {loading ? <p className="text-sm text-brand-text-muted">Lade CRM Daten…</p> : null}

      {!loading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <section className="panel p-5">
            <h2 className="flex items-center gap-2 text-xl">
              <ListTodo className="h-5 w-5 text-brand-accent" />
              Tasks ({tasks.length})
            </h2>
            <div className="mt-3 space-y-2">
              {tasks.slice(0, 8).map((item) => (
                <article key={String(item.id)} className="rounded-xl border border-brand-border p-3 text-sm">
                  <p className="font-semibold text-brand-text">{String(item.title || 'Task')}</p>
                  <p className="text-brand-text-muted">
                    {String(item.entity_type || 'entity')}:{String(item.entity_id || '')}
                  </p>
                  <p className="text-brand-text-muted">Status: {String(item.status || 'open')}</p>
                </article>
              ))}
              {tasks.length === 0 ? <p className="text-sm text-brand-text-muted">Keine Tasks vorhanden.</p> : null}
            </div>
          </section>

          <section className="panel p-5">
            <h2 className="flex items-center gap-2 text-xl">
              <CheckCircle2 className="h-5 w-5 text-brand-accent" />
              Aktivitäten ({activities.length})
            </h2>
            <div className="mt-3 space-y-2">
              {activities.slice(0, 8).map((item) => (
                <article key={String(item.id)} className="rounded-xl border border-brand-border p-3 text-sm">
                  <p className="font-semibold text-brand-text">{String(item.activity_type || 'activity')}</p>
                  <p className="text-brand-text-muted">{String(item.message || '')}</p>
                  <p className="text-brand-text-muted">
                    {String(item.entity_type || 'entity')}:{String(item.entity_id || '')}
                  </p>
                </article>
              ))}
              {activities.length === 0 ? <p className="text-sm text-brand-text-muted">Keine Aktivitäten vorhanden.</p> : null}
            </div>
          </section>

          <section className="panel p-5">
            <h2 className="flex items-center gap-2 text-xl">
              <MessageSquareText className="h-5 w-5 text-brand-accent" />
              Notes ({notes.length})
            </h2>
            <div className="mt-3 space-y-2">
              {notes.slice(0, 8).map((item) => (
                <article key={String(item.id)} className="rounded-xl border border-brand-border p-3 text-sm">
                  <p className="font-semibold text-brand-text">{String(item.entity_type || 'entity')}</p>
                  <p className="text-brand-text-muted">{String(item.note || '')}</p>
                </article>
              ))}
              {notes.length === 0 ? <p className="text-sm text-brand-text-muted">Keine Notes vorhanden.</p> : null}
            </div>
          </section>
        </div>
      ) : null}

      <section className="mt-6 panel p-5">
        <h2 className="text-xl">SLA Monitor Einstieg</h2>
        <p className="mt-2 text-sm text-brand-text-muted">
          Für SLA-Breaches und Reaktionszeiten nutze die dedizierte Ansicht unter <code>/admin/csm/sla</code>.
        </p>
        <div className="mt-3">
          <Link href="/admin/csm/sla">
            <Button>SLA Monitor öffnen</Button>
          </Link>
        </div>
      </section>
    </main>
  )
}
