// Purpose: Admin orders list with filter and retry (Step 8)
// Docs: PLAN-VERKAUFSFAEHIG.md (Step 8 — Admin Dashboard)

import Link from 'next/link'
import { getAdminOrders } from '@/lib/actions/admin'
import { FulfillmentBadge } from '../components/FulfillmentBadge'
import { RetryCjButton } from '../components/RetryCjButton'

export const dynamic = 'force-dynamic'

const FILTERS = [
  { value: 'all', label: 'Alle' },
  { value: 'pending', label: 'Ausstehend' },
  { value: 'forwarded', label: 'An CJ übergeben' },
  { value: 'shipped', label: 'Versendet' },
  { value: 'failed', label: 'Fehlgeschlagen' },
]

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { filter = 'all' } = await searchParams
  const orders = await getAdminOrders(filter)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/admin/bestellungen?filter=${f.value}`}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === f.value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border hover:bg-muted'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted p-8 text-center">
          <p className="text-muted-foreground">Keine Bestellungen gefunden.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order) => (
            <div key={order.id} className="rounded-lg border border-border p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold">
                      {order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <FulfillmentBadge status={order.fulfillment_status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {order.email} ·{' '}
                    {new Date(order.created_at).toLocaleString('de-DE')}
                  </p>
                  <ul className="mt-2 text-sm">
                    {order.items.map((item, i) => (
                      <li key={i}>
                        {item.quantity}x {item.title} —{' '}
                        {((item.unit_amount * item.quantity) / 100).toFixed(2)} €
                      </li>
                    ))}
                  </ul>
                  {order.tracking_number && (
                    <p className="mt-2 text-sm">
                      Tracking:{' '}
                      <a
                        href={`https://t.17track.net/de#nums=${encodeURIComponent(order.tracking_number)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-primary underline"
                      >
                        {order.tracking_number}
                      </a>
                    </p>
                  )}
                  {order.cj_order_id && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      CJ-Order: {order.cj_order_id}
                      {order.cj_order_status ? ` (${order.cj_order_status})` : ''}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-lg font-bold">
                    {(order.amount_total / 100).toFixed(2)} €
                  </span>
                  {order.fulfillment_status === 'failed' && (
                    <RetryCjButton orderId={order.id} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
