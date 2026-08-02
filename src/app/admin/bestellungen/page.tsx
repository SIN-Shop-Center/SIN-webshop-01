// Purpose: Admin orders list with filter chips (Step 8 + Step 10)
// Docs: PLAN-VERKAUFSFAEHIG.md

import Link from 'next/link'
import { getAdminOrders } from '@/lib/actions/admin'
import { FulfillmentBadge } from '../components/FulfillmentBadge'
import { RetryCjButton } from '../components/RetryCjButton'
import { formatEuro, formatDateTime } from '@/lib/format'
import { PackageIcon, ExternalLinkIcon } from '@/components/icons'

export const dynamic = 'force-dynamic'

const FILTERS = [
  { value: 'all', label: 'Alle' },
  { value: 'pending', label: 'Ausstehend' },
  { value: 'forwarded', label: 'An CJ übergeben' },
  { value: 'shipped', label: 'Versendet' },
  { value: 'failed', label: 'Fehlgeschlagen' },
] as const

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { filter = 'all' } = await searchParams
  const orders = await getAdminOrders(filter)

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Bestellungen filtern" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.value
          return (
            <Link
              key={f.value}
              href={`/admin/bestellungen?filter=${f.value}`}
              aria-current={active ? 'page' : undefined}
              className={
                'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ' +
                (active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:bg-muted')
              }
            >
              {f.label}
            </Link>
          )
        })}
      </nav>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
          <PackageIcon
            className="mb-4 size-12 text-muted-foreground"
            aria-hidden
          />
          <h2 className="mb-1 text-lg font-semibold">Keine Bestellungen gefunden</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Für diesen Filter sind aktuell keine Bestellungen vorhanden.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {orders.map((order) => (
            <li
              key={order.id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-sm font-semibold">
                      {order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <FulfillmentBadge status={order.fulfillment_status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {order.email} · {formatDateTime(order.created_at)}
                  </p>
                  <ul className="mt-2 text-sm">
                    {order.items.map((item, i) => (
                      <li key={i}>
                        {item.quantity}× {item.title} —{' '}
                        <span className="text-muted-foreground">
                          {formatEuro(item.unit_amount * item.quantity)}
                        </span>
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
                        className="inline-flex items-center gap-1 font-mono text-primary underline"
                      >
                        {order.tracking_number}
                        <ExternalLinkIcon className="size-3" aria-hidden />
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
                  <span className="text-lg font-bold tabular-nums">
                    {formatEuro(order.amount_total)}
                  </span>
                  {order.fulfillment_status === 'failed' && (
                    <RetryCjButton orderId={order.id} />
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
