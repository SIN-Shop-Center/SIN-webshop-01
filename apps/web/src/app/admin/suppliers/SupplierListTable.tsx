'use client'

import Link from '@/components/ui/Link'
import { ArrowUpRight, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatDateTime } from '@/lib/utils'
import {
  canStartRegistration,
  complianceTone,
  formatStatusLabel,
  getNextSupplierAction,
  onboardingTone,
  statusBadgeClass,
  supplierStatusTone,
} from './supplier-ui'
import type { SupplierRow } from './types'

type SupplierListTableProps = {
  total: number
  items: SupplierRow[]
  loading: boolean
  error: string | null
  page: number
  totalPages: number
  startingSupplierID: string | null
  onPrevPage: () => void
  onNextPage: () => void
  onStartRegistration: (supplier: SupplierRow) => void
}

export function SupplierListTable({
  total,
  items,
  loading,
  error,
  page,
  totalPages,
  startingSupplierID,
  onPrevPage,
  onNextPage,
  onStartRegistration,
}: SupplierListTableProps) {
  return (
    <section className="panel p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl">Supplier Pipeline</h2>
          <p className="mt-1 text-sm text-brand-text-muted">
            {total} Supplier insgesamt. Jede Zeile zeigt sofort den nächsten Schritt statt reiner Stammdaten.
          </p>
        </div>
      </div>

      {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {loading ? <p className="text-sm text-brand-text-muted">Lade Lieferanten…</p> : null}
      {!loading && !error && items.length === 0 ? <p className="text-sm text-brand-text-muted">Keine Lieferanten gefunden.</p> : null}

      {!loading && items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => {
            const action = getNextSupplierAction(item, item.products_count || 0)
            const showRegistrationButton = canStartRegistration(item)

            return (
              <article key={item.id} className="rounded-2xl border border-brand-border bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-brand-text">{item.name}</h3>
                      <span className={statusBadgeClass(supplierStatusTone(item.status))}>{formatStatusLabel(item.status)}</span>
                      <span className={statusBadgeClass(onboardingTone(item.onboarding_status))}>{formatStatusLabel(item.onboarding_status)}</span>
                      <span className={statusBadgeClass(complianceTone(item.compliance_state))}>{formatStatusLabel(item.compliance_state)}</span>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl bg-brand-bg-muted px-3 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-brand-text-muted">Nächster Schritt</p>
                        <p className="mt-2 text-sm font-semibold text-brand-text">{action.title}</p>
                        <p className="mt-1 text-sm text-brand-text-muted">{action.detail}</p>
                      </div>

                      <div className="rounded-2xl bg-brand-bg-muted px-3 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-brand-text-muted">Setup</p>
                        <div className="mt-2 space-y-1 text-sm text-brand-text-muted">
                          <p>Land: <span className="font-semibold text-brand-text">{item.country || '—'}</span></p>
                          <p>Produkte: <span className="font-semibold text-brand-text">{item.products_count ?? 0}</span></p>
                          <p>Secret: <span className="font-semibold text-brand-text">{item.has_secret ? 'Gesetzt' : 'Fehlt'}</span></p>
                        </div>
                      </div>

                      <div className="rounded-2xl bg-brand-bg-muted px-3 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-brand-text-muted">Kontakt</p>
                        <div className="mt-2 space-y-1 text-sm text-brand-text-muted">
                          <p className="truncate">{item.contact_email || item.email || 'Keine Kontakt-Mail'}</p>
                          <p className="truncate">{item.portal_url || item.registration_url || item.website || 'Kein Portal-Link'}</p>
                          <p>Aktualisiert: <span className="font-semibold text-brand-text">{item.updated_at ? formatDateTime(item.updated_at) : '—'}</span></p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex w-full flex-col gap-2 lg:w-auto lg:min-w-52">
                    {showRegistrationButton ? (
                      <Button
                        onClick={() => onStartRegistration(item)}
                        isLoading={startingSupplierID === item.id}
                        fullWidth
                      >
                        Registrieren
                      </Button>
                    ) : null}

                    <Link
                      href={`/admin/suppliers/${item.id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-border bg-white px-4 py-2.5 text-sm font-semibold text-brand-text transition hover:border-brand-accent"
                    >
                      Details öffnen
                      <ChevronRight className="h-4 w-4" />
                    </Link>

                    {(item.portal_url || item.registration_url || item.website) ? (
                      <a
                        href={item.portal_url || item.registration_url || item.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-border bg-brand-bg-muted px-4 py-2.5 text-sm font-semibold text-brand-text transition hover:border-brand-accent"
                      >
                        Supplier öffnen
                        <ArrowUpRight className="h-4 w-4" />
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between">
        <Button variant="outline" onClick={onPrevPage} disabled={page <= 1 || loading}>
          Zurück
        </Button>
        <p className="text-sm text-brand-text-muted">
          Seite {page} von {Math.max(totalPages, 1)}
        </p>
        <Button variant="outline" onClick={onNextPage} disabled={page >= totalPages || loading}>
          Weiter
        </Button>
      </div>
    </section>
  )
}
