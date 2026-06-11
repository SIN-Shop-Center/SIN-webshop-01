// Purpose: Admin dashboard with KPIs and failed-order alerts (Step 8)
// Docs: PLAN-VERKAUFSFAEHIG.md (Step 8 — Admin Dashboard)

import Link from 'next/link'
import { getAdminStats, getAdminOrders } from '@/lib/actions/admin'
import { FulfillmentBadge } from './components/FulfillmentBadge'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const [stats, failedOrders] = await Promise.all([
    getAdminStats(),
    getAdminOrders('failed'),
  ])

  const cards = [
    { label: 'Bestellungen gesamt', value: String(stats.orderCount) },
    { label: 'Umsatz', value: `${(stats.revenueCents / 100).toFixed(2)} €` },
    { label: 'An CJ weitergeleitet', value: String(stats.forwardedCount) },
    { label: 'Versendet', value: String(stats.shippedCount) },
  ]

  return (
    <div className="flex flex-col gap-8">
      {stats.failedCount > 0 && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          <p className="font-semibold text-red-700 dark:text-red-300">
            {stats.failedCount} Bestellung(en) konnten nicht an CJ weitergeleitet
            werden und brauchen deine Aufmerksamkeit.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border border-border p-6">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      {failedOrders.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">
            Fehlgeschlagene CJ-Weiterleitungen
          </h2>
          <div className="flex flex-col gap-2">
            {failedOrders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/bestellungen?filter=failed`}
                className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted"
              >
                <div>
                  <span className="font-mono text-sm">
                    {order.id.slice(0, 8).toUpperCase()}
                  </span>
                  <span className="ml-3 text-sm text-muted-foreground">
                    {order.email}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">
                    {(order.amount_total / 100).toFixed(2)} €
                  </span>
                  <FulfillmentBadge status={order.fulfillment_status} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
