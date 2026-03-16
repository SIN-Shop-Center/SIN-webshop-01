'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from '@/components/ui/Link'
import { useParams } from 'next/navigation'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getAuthHeaders } from '@/lib/api/auth'
import { AdminRecord, DOMAIN_COLUMNS, DOMAIN_CONFIG, extractItems, formatCell, toRecords } from './domain-table'

export default function AdminDomainPage() {
  const params = useParams<{ domain: string }>()
  const domain = params?.domain || ''
  const config = useMemo(() => DOMAIN_CONFIG[domain], [domain])
  const columns = useMemo(() => DOMAIN_COLUMNS[domain] || ['id', 'status', 'created_at'], [domain])
  const [items, setItems] = useState<AdminRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const run = async () => {
      if (!config) {
        setError('domain_not_found')
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(config.endpoint, {
          cache: 'no-store',
          headers: await getAuthHeaders(),
        })
        if (!response.ok) {
          throw new Error(`request_failed:${response.status}`)
        }
        const payload = await response.json()
        if (!active) {
          return
        }
        setItems(toRecords(extractItems(payload)))
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'domain_load_failed')
          setItems([])
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void run()
    return () => {
      active = false
    }
  }, [config])

  return (
    <main className="pb-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-brand-text-muted hover:text-brand-text">
            <ArrowLeft className="h-4 w-4" />
            Zurück zum Admin-Hub
          </Link>
          <h1 className="mt-2 text-4xl">{config?.title || 'Admin-Domain'}</h1>
          <p className="mt-2 text-brand-text-muted">Live-Daten aus der Domain-API, ohne monolithische Sammelseite.</p>
        </div>
        <Button variant="outline" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => window.location.reload()}>
          Neu laden
        </Button>
      </header>

      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <section className="panel p-5">
        <h2 className="text-xl">Einträge</h2>
        {loading ? <p className="mt-3 text-sm text-brand-text-muted">Lade Daten…</p> : null}
        {!loading && items.length === 0 ? (
          <p className="mt-3 text-sm text-brand-text-muted">Keine Einträge gefunden.</p>
        ) : null}
        {!loading && items.length > 0 ? (
          <div className="mt-4 overflow-x-auto rounded-xl border border-brand-border">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-brand-surface-strong">
                <tr>
                  {columns.map((column) => (
                    <th key={column} className="border-b border-brand-border px-3 py-2 text-left font-semibold text-brand-text">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.slice(0, 20).map((item, index) => (
                  <tr key={String(item.id ?? `row-${index}`)} className="odd:bg-white even:bg-brand-surface-strong/40">
                    {columns.map((column) => (
                      <td key={`${String(item.id ?? 'item')}:${column}`} className="border-b border-brand-border px-3 py-2 text-brand-text">
                        {formatCell(item[column])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </main>
  )
}
