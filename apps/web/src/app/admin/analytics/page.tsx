'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, RefreshCw, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ExperimentPanel } from '@/features/admin'
import { getAuthHeaders } from '@/lib/api/auth'

type FunnelResponse = {
  windowHours: number
  funnel: Record<string, number>
  conversion: {
    viewToCart: number
    cartToCheckout: number
    checkoutToPurchase: number
  }
}

type AlertItem = {
  name: string
  triggered: boolean
  severity: string
  threshold: string
  reason: string
  metrics: Record<string, unknown>
}

type AlertsResponse = {
  windowHours: number
  alerts: AlertItem[]
}

type ExperimentItem = {
  experimentId: string
  variant: string
  exposures: number
  checkoutStarts: number
  purchases: number
  checkoutConversionPct: number
  purchaseConversionPct: number
}

type ExperimentResponse = {
  windowHours: number
  items: ExperimentItem[]
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: 'no-store',
    headers: await getAuthHeaders(),
  })
  if (!response.ok) {
    throw new Error(`request_failed:${response.status}`)
  }
  return response.json() as Promise<T>
}

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [funnel, setFunnel] = useState<FunnelResponse | null>(null)
  const [alerts, setAlerts] = useState<AlertsResponse | null>(null)
  const [experiments, setExperiments] = useState<ExperimentResponse | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [funnelData, alertsData, experimentData] = await Promise.all([
        fetchJson<FunnelResponse>('/api/analytics/funnel?hours=24'),
        fetchJson<AlertsResponse>('/api/analytics/alerts?hours=2'),
        fetchJson<ExperimentResponse>('/api/analytics/experiments?hours=24'),
      ])
      setFunnel(funnelData)
      setAlerts(alertsData)
      setExperiments(experimentData)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'analytics_load_failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => {
      void load()
    }, 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const hasTriggeredAlerts = useMemo(
    () => (alerts?.alerts || []).some((alert) => alert.triggered),
    [alerts],
  )

  return (
    <main className="pb-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-text-muted">War-Room</p>
          <h1 className="mt-1 text-4xl">Analytics & Alerting</h1>
        </div>
        <Button variant="outline" onClick={() => void load()} leftIcon={<RefreshCw className="h-4 w-4" />}>
          Aktualisieren
        </Button>
      </header>

      {error ? <p className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <section className="grid gap-4 md:grid-cols-3">
        <article className="panel p-5">
          <p className="text-sm text-brand-text-muted">View to Cart</p>
          <p className="mt-2 text-3xl font-semibold text-brand-text">{funnel ? funnel.conversion.viewToCart.toFixed(1) : '0.0'}%</p>
        </article>
        <article className="panel p-5">
          <p className="text-sm text-brand-text-muted">Cart to Checkout</p>
          <p className="mt-2 text-3xl font-semibold text-brand-text">{funnel ? funnel.conversion.cartToCheckout.toFixed(1) : '0.0'}%</p>
        </article>
        <article className="panel p-5">
          <p className="text-sm text-brand-text-muted">Checkout to Purchase</p>
          <p className="mt-2 text-3xl font-semibold text-brand-text">{funnel ? funnel.conversion.checkoutToPurchase.toFixed(1) : '0.0'}%</p>
        </article>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="panel p-5">
          <h2 className="flex items-center gap-2 text-xl">
            <TrendingUp className="h-5 w-5 text-brand-accent" />
            Funnel Counts (24h)
          </h2>
          <dl className="mt-4 grid gap-2 text-sm">
            {Object.entries(funnel?.funnel || {}).map(([name, count]) => (
              <div key={name} className="flex items-center justify-between border-b border-brand-border pb-2">
                <dt className="text-brand-text-muted">{name}</dt>
                <dd className="font-semibold text-brand-text">{count}</dd>
              </div>
            ))}
          </dl>
        </article>

        <article className="panel p-5">
          <h2 className="flex items-center gap-2 text-xl">
            <AlertTriangle className={hasTriggeredAlerts ? 'h-5 w-5 text-red-600' : 'h-5 w-5 text-brand-accent'} />
            Alerts (2h)
          </h2>
          <div className="mt-4 space-y-3">
            {(alerts?.alerts || []).map((alert) => (
              <div
                key={alert.name}
                className={[
                  'rounded-xl border px-3 py-2 text-sm',
                  alert.triggered ? 'border-red-300 bg-red-50 text-red-800' : 'border-brand-border bg-brand-surface text-brand-text',
                ].join(' ')}
              >
                <p className="font-semibold">{alert.name}</p>
                <p>{alert.threshold}</p>
                <p className="text-xs opacity-80">{alert.reason}</p>
              </div>
            ))}
            {!loading && (alerts?.alerts || []).length === 0 ? (
              <p className="text-sm text-brand-text-muted">Keine Alerts vorhanden.</p>
            ) : null}
          </div>
        </article>
      </section>

      <section className="mt-6">
        <ExperimentPanel items={experiments?.items || []} loading={loading} />
      </section>
    </main>
  )
}
