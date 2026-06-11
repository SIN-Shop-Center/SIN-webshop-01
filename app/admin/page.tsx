// Purpose: Admin dashboard with KPIs and failed-order alerts (Step 8 + Step 10)
// Docs: PLAN-VERKAUFSFAEHIG.md

import Link from 'next/link'
import { getAdminStats, getAdminOrders } from '@/lib/actions/admin'
import { FulfillmentBadge } from './components/FulfillmentBadge'
import { formatEuro, formatDateTime } from '@/lib/format'
import { AlertCircleIcon, ArrowRightIcon } from '@/components/icons'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const [stats, failedOrders] = await Promise.all([
    getAdminStats(),
    getAdminOrders('failed'),
  ])

  const cards = [
    { label: 'Bestellungen gesamt', value: String(stats.orderCount) },
    { label: 'Umsatz', value: formatEuro(stats.revenueCents) },
    { label: 'An CJ weitergeleitet', value: String(stats.forwardedCount) },
    { label: 'Versendet', value: String(stats.shippedCount) },
  ]

  return (
    <div className="flex flex-col gap-8">
      {stats.failedCount > 0 && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4"
        >
          <AlertCircleIcon
            className="mt-0.5 size-5 shrink-0 text-destructive"
            aria-hidden
          />
          <div>
            <p className="font-semibold text-destructive">
              {stats.failedCount} Bestellung
              {stats.failedCount === 1 ? '' : 'en'} konnte
              {stats.failedCount === 1 ? 'n' : ''} nicht an CJ weitergeleitet
              werden.
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Diese brauchen deine Aufmerksamkeit — siehe{' '}
              <Link
                href="/admin/bestellungen?filter=failed"
                className="font-medium text-primary underline"
              >
                Bestellungen → Fehlgeschlagen
              </Link>
              .
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-border bg-card p-6"
          >
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{card.value}</p>
          </div>
        ))}
      </div>

      {failedOrders.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Fehlgeschlagene CJ-Weiterleitungen
            </h2>
            <Link
              href="/admin/bestellungen?filter=failed"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Alle anzeigen
              <ArrowRightIcon className="size-4" aria-hidden />
            </Link>
          </div>
          <ul className="flex flex-col gap-2">
            {failedOrders.slice(0, 5).map((order) => (
              <li key={order.id}>
                <Link
                  href={`/admin/bestellungen?filter=failed`}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted"
                >
                  <div>
                    <p className="font-mono text-sm font-semibold">
                      {order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.email} · {formatDateTime(order.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold tabular-nums">
                      {formatEuro(order.amount_total)}
                    </span>
                    <FulfillmentBadge status={order.fulfillment_status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
