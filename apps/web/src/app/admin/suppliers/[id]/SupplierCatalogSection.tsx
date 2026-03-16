import Link from '@/components/ui/Link'
import { ArrowUpRight, CheckCircle2, PackagePlus, RefreshCw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatDateTime, formatPrice } from '@/lib/utils'
import { formatStatusLabel, statusBadgeClass } from '../supplier-ui'
import type { SupplierCatalogProduct } from './types'

type SupplierCatalogSectionProps = {
  items: SupplierCatalogProduct[]
  syncingCatalog: boolean
  notice?: string | null
  importingCatalogProductID: string | null
  onSync: () => void
  onImport: (catalogProductID: string) => void
}

function catalogTone(status?: string) {
  if (status === 'approved' || status === 'imported') return 'success'
  if (status === 'reviewing') return 'info'
  if (status === 'rejected' || status === 'archived') return 'danger'
  return 'warning'
}

export function SupplierCatalogSection({ items, syncingCatalog, notice, importingCatalogProductID, onSync, onImport }: SupplierCatalogSectionProps) {
  return (
    <section className="panel p-5 xl:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl">Supplier-Katalog</h2>
          <p className="mt-1 text-sm text-brand-text-muted">
            Diese Produkte liegen getrennt vom Shop-Katalog. Der Admin entscheidet hier, was per Klick in den Shop übernommen wird.
          </p>
        </div>
        <div className="rounded-2xl border border-brand-border bg-brand-bg-muted px-3 py-2 text-sm text-brand-text-muted">
          <p className="font-semibold text-brand-text">{items.length}</p>
          <p>Katalogprodukte geladen</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="outline" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={onSync} isLoading={syncingCatalog}>
          Katalog synchronisieren
        </Button>
        {notice ? <p className="text-sm text-brand-text-muted">{notice}</p> : null}
      </div>

      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-2xl border border-brand-border bg-white p-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-brand-text">{item.title}</h3>
                  <span className={statusBadgeClass(catalogTone(item.status))}>{formatStatusLabel(item.status)}</span>
                  {item.ai_score !== undefined && item.ai_score !== null ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-brand-border bg-brand-bg-muted px-2.5 py-1 text-xs font-semibold text-brand-text">
                      <Sparkles className="h-3.5 w-3.5" />
                      KI-Score {item.ai_score}
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-brand-bg-muted px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-text-muted">Supplier-Daten</p>
                    <div className="mt-2 space-y-1 text-sm text-brand-text-muted">
                      <p>SKU: <span className="font-semibold text-brand-text">{item.supplier_sku || '—'}</span></p>
                      <p>Preis: <span className="font-semibold text-brand-text">{item.price ? formatPrice(item.price) : '—'}</span></p>
                      <p>Lead Time: <span className="font-semibold text-brand-text">{item.lead_time_days ?? '—'}</span></p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-brand-bg-muted px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-text-muted">Signals</p>
                    <div className="mt-2 space-y-1 text-sm text-brand-text-muted">
                      <p>MOQ: <span className="font-semibold text-brand-text">{item.minimum_order_quantity ?? '—'}</span></p>
                      <p>Bestandshinweis: <span className="font-semibold text-brand-text">{item.stock_hint ?? '—'}</span></p>
                      <p>Zuletzt gesehen: <span className="font-semibold text-brand-text">{item.last_seen_at ? formatDateTime(item.last_seen_at) : '—'}</span></p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-brand-bg-muted px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-text-muted">Review</p>
                    <p className="mt-2 text-sm text-brand-text-muted">{item.review_note || 'Noch keine Review-Notiz vorhanden.'}</p>
                    {item.imported_product ? (
                      <p className="mt-2 text-sm font-semibold text-emerald-700">
                        Bereits importiert: {item.imported_product.name}
                      </p>
                    ) : null}
                  </div>
                </div>

                {item.description ? <p className="mt-3 text-sm text-brand-text-muted">{item.description}</p> : null}
              </div>

              <div className="flex w-full flex-col gap-2 xl:w-auto xl:min-w-56">
                {item.imported_product ? (
                  <Link
                    href={`/admin/products`}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Im Shop angelegt
                  </Link>
                ) : (
                  <Button
                    leftIcon={<PackagePlus className="h-4 w-4" />}
                    onClick={() => onImport(item.id)}
                    isLoading={importingCatalogProductID === item.id}
                    fullWidth
                  >
                    In Shop übernehmen
                  </Button>
                )}

                {item.source_url ? (
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-border bg-brand-bg-muted px-4 py-2.5 text-sm font-semibold text-brand-text transition hover:border-brand-accent"
                  >
                    Quelle öffnen
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                ) : null}
              </div>
            </div>
          </article>
        ))}

        {items.length === 0 ? (
          <div className="rounded-2xl border border-brand-border bg-brand-bg-muted px-4 py-6 text-sm text-brand-text-muted">
            Noch keine Supplier-Produkte vorhanden. Die neue Katalog-Tabelle ist vorbereitet; sobald die KI oder ein Sync-Worker Produkte schreibt,
            tauchen sie hier zur Auswahl auf.
          </div>
        ) : null}
      </div>
    </section>
  )
}
