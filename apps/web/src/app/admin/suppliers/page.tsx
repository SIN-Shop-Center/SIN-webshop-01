'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bot, RefreshCw, ShieldCheck, Sparkles, Workflow } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getAuthHeaders } from '@/lib/api/auth'
import { SupplierFilters } from './SupplierFilters'
import { SupplierListTable } from './SupplierListTable'
import { canStartRegistration, getNextSupplierAction, isSupplierAutopilotReady } from './supplier-ui'
import type { SupplierListResponse, SupplierRow } from './types'

type FlashMessage = {
  tone: 'success' | 'error'
  message: string
}

export default function AdminSuppliersPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [country, setCountry] = useState('')
  const [onboardingStatus, setOnboardingStatus] = useState('')
  const [complianceState, setComplianceState] = useState('')
  const [page, setPage] = useState(1)
  const [reloadSeed, setReloadSeed] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<SupplierRow[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [startingSupplierID, setStartingSupplierID] = useState<string | null>(null)
  const [flash, setFlash] = useState<FlashMessage | null>(null)

  const query = useMemo(() => {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', '20')
    params.set('sort_by', 'updated_at')
    params.set('sort_order', 'desc')
    if (search.trim()) params.set('search', search.trim())
    if (status.trim()) params.set('status', status.trim())
    if (country.trim()) params.set('country', country.trim())
    if (onboardingStatus.trim()) params.set('onboarding_status', onboardingStatus.trim())
    if (complianceState.trim()) params.set('compliance_state', complianceState.trim())
    return params.toString()
  }, [complianceState, country, onboardingStatus, page, search, status])

  const loadSuppliers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/suppliers?${query}`, { cache: 'no-store', headers: await getAuthHeaders() })
      if (!response.ok) {
        throw new Error(`suppliers_fetch_failed:${response.status}`)
      }
      const payload = (await response.json()) as SupplierListResponse
      const data = payload.data || {}
      setItems(data.suppliers || [])
      setTotalPages(Math.max(data.pagination?.totalPages || 1, 1))
      setTotal(data.pagination?.total || 0)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'suppliers_fetch_failed')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    void loadSuppliers()
  }, [loadSuppliers, reloadSeed])

  const refresh = () => {
    setPage(1)
    setSearch((value) => value.trim())
    setCountry((value) => value.trim().toUpperCase())
    setStatus((value) => value.trim())
    setOnboardingStatus((value) => value.trim())
    setComplianceState((value) => value.trim())
    setReloadSeed((value) => value + 1)
  }

  const startRegistration = useCallback(
    async (supplier: SupplierRow) => {
      setStartingSupplierID(supplier.id)
      setFlash(null)
      setError(null)
      try {
        const response = await fetch(`/api/admin/suppliers/${supplier.id}/onboarding/runs`, {
          method: 'POST',
          cache: 'no-store',
          headers: await getAuthHeaders({ 'content-type': 'application/json' }),
          body: JSON.stringify({
            execution_mode: 'hybrid',
            skill_id: 'supplier.onboarding.default',
            dry_run: false,
          }),
        })

        if (!response.ok) {
          throw new Error(`supplier_registration_start_failed:${response.status}`)
        }

        setFlash({
          tone: 'success',
          message: `Registrierungs-Run für ${supplier.name} gestartet. Falls E-Mail-Verifikation nötig ist, landet der Supplier automatisch in "Awaiting Access".`,
        })
        await loadSuppliers()
      } catch (startError) {
        const message = startError instanceof Error ? startError.message : 'supplier_registration_start_failed'
        setFlash({ tone: 'error', message })
        setError(message)
      } finally {
        setStartingSupplierID(null)
      }
    },
    [loadSuppliers],
  )

  const summary = useMemo(() => {
    const visibleReadyForRegistration = items.filter((item) => canStartRegistration(item)).length
    const visibleAwaitingAccess = items.filter((item) => item.onboarding_status === 'awaiting_access').length
    const visibleAutopilotReady = items.filter((item) => isSupplierAutopilotReady(item, item.products_count || 0)).length

    return [
      {
        label: 'Sofort registrierbar',
        value: visibleReadyForRegistration,
        description: 'Supplier mit Ziel-Link oder API-Endpunkt und ohne abgeschlossenes Onboarding.',
        icon: Workflow,
      },
      {
        label: 'Braucht Admin',
        value: visibleAwaitingAccess,
        description: 'E-Mail-Bestätigung, Restprofil oder manuelle Freischaltung steht noch aus.',
        icon: ShieldCheck,
      },
      {
        label: 'Autopilot bereit',
        value: visibleAutopilotReady,
        description: 'Verbunden, freigegeben, mit Produktzuordnung und aktivem Auto-Fulfillment.',
        icon: Bot,
      },
    ]
  }, [items])

  const spotlightAction = useMemo(() => {
    const candidate = items[0]
    if (!candidate) {
      return null
    }
    return getNextSupplierAction(candidate, candidate.products_count || 0)
  }, [items])

  return (
    <main className="pb-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-eyebrow">Supplier Autopilot</p>
          <h1 className="mt-2 text-4xl">Lieferanten</h1>
          <p className="mt-3 max-w-3xl text-brand-text-muted">
            Die KI sammelt Supplier, der Admin entscheidet nur noch das Nötigste: registrieren, Zugang fertigstellen, Produkte zuordnen und den
            Bestell-Autopilot freigeben.
          </p>
        </div>
        <Button variant="outline" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={refresh}>
          Neu laden
        </Button>
      </header>

      <section className="panel mb-4 grid gap-3 p-4 lg:grid-cols-[1.5fr_repeat(3,minmax(0,1fr))]">
        <article className="rounded-2xl border border-brand-border bg-brand-surface px-4 py-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 rounded-full bg-black p-2 text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-brand-text">Weniger klicken, mehr entscheiden</p>
              <p className="mt-1 text-sm text-brand-text-muted">
                `Registrieren` startet direkt den hybriden Onboarding-Run. Nur wenn Supplier Verifikation oder Captcha verlangt, muss der
                Admin kurz übernehmen.
              </p>
            </div>
          </div>
        </article>

        {summary.map((item) => {
          const Icon = item.icon
          return (
            <article key={item.label} className="rounded-2xl border border-brand-border bg-brand-surface px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-brand-text-muted">{item.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-brand-text">{item.value}</p>
                </div>
                <span className="rounded-full bg-brand-bg-muted p-2 text-brand-text">
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 text-sm text-brand-text-muted">{item.description}</p>
            </article>
          )
        })}
      </section>

        {spotlightAction ? (
          <section className="panel mb-4 flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-brand-text">Aktueller Fokus</p>
              <p className="mt-1 text-sm text-brand-text-muted">
                {spotlightAction.title}: {spotlightAction.detail}
              </p>
            </div>
            <p className="rounded-full border border-brand-border bg-white px-3 py-1 text-sm font-semibold text-brand-text">{total} Supplier gesamt</p>
          </section>
        ) : null}

        {flash ? (
          <p
            className={[
              'mb-4 rounded-2xl px-4 py-3 text-sm',
              flash.tone === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700',
            ].join(' ')}
          >
            {flash.message}
          </p>
        ) : null}

        <SupplierFilters
          search={search}
          status={status}
          country={country}
          onboardingStatus={onboardingStatus}
          complianceState={complianceState}
          onSearchChange={(value) => {
            setSearch(value)
            setPage(1)
          }}
          onStatusChange={(value) => {
            setStatus(value)
            setPage(1)
          }}
          onCountryChange={(value) => {
            setCountry(value)
            setPage(1)
          }}
          onOnboardingStatusChange={(value) => {
            setOnboardingStatus(value)
            setPage(1)
          }}
          onComplianceStateChange={(value) => {
            setComplianceState(value)
            setPage(1)
          }}
        />

      <SupplierListTable
        total={total}
        items={items}
        loading={loading}
        error={error}
        page={page}
        totalPages={totalPages}
        startingSupplierID={startingSupplierID}
        onPrevPage={() => setPage((value) => Math.max(value - 1, 1))}
        onNextPage={() => setPage((value) => Math.min(value + 1, Math.max(totalPages, 1)))}
        onStartRegistration={startRegistration}
      />
    </main>
  )
}
