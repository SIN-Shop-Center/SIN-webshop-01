import Image from 'next/image'
import Link from '@/components/ui/Link'
import { ShoppingBagIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui'
import type { AccountOrderSource } from '@/features/account/client'
import { STATUS_COLORS, STATUS_LABELS } from '@/features/account/constants'
import { formatDate, formatPrice } from '@/lib/utils'
import type { Order } from '@/types'

interface OrdersTabProps {
  orders: Order[]
  loading: boolean
  error: string | null
  source: AccountOrderSource
}

function OrderDataHint({ source, error }: { source: AccountOrderSource; error: string | null }) {
  if (source === 'api') {
    return null
  }

  if (source === 'empty') {
    return (
      <p className="rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text-muted">
        Keine Bestellungen vorhanden.
      </p>
    )
  }

  if (source === 'unauthorized') {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
        Für Bestelldaten ist ein gültiger Login erforderlich.
      </p>
    )
  }

  return (
    <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
      API nicht erreichbar, Fallback-Daten aktiv{error ? ` (${error})` : ''}.
    </p>
  )
}

export function OrdersTab({ orders, loading, error, source }: OrdersTabProps) {
  if (loading) {
    return (
      <section className="panel p-8">
        <h2 className="text-2xl">Meine Bestellungen</h2>
        <p className="mt-2 text-brand-text-muted">Bestelldaten werden geladen...</p>
      </section>
    )
  }

  if (source === 'unauthorized' && orders.length === 0) {
    return (
      <section className="panel p-8">
        <h2 className="text-2xl">Meine Bestellungen</h2>
        <OrderDataHint source={source} error={error} />
      </section>
    )
  }

  if (orders.length === 0) {
    return (
      <section className="panel p-12 text-center">
        <ShoppingBagIcon className="mx-auto h-14 w-14 text-brand-text-muted" />
        <h2 className="mt-4 text-2xl">Keine Bestellungen</h2>
        <p className="mt-2 text-brand-text-muted">Sobald du bestellst, findest du hier deinen Verlauf.</p>
        <div className="mt-4">
          <OrderDataHint source={source} error={error} />
        </div>
        <Link href="/products" className="mt-5 inline-flex">
          <Button>Jetzt einkaufen</Button>
        </Link>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl">Meine Bestellungen</h2>
        <span className="text-sm text-brand-text-muted">{orders.length} Bestellungen</span>
      </div>
      <OrderDataHint source={source} error={error} />

      {orders.map((order) => (
        <article key={order.id} className="panel p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-brand-border pb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-brand-text-muted">Bestellnummer</p>
              <p className="font-mono text-sm font-semibold">{order.id}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-brand-text-muted">Datum</p>
              <p>{formatDate(order.createdAt)}</p>
            </div>
            <span className={[STATUS_COLORS[order.status], 'rounded-full px-3 py-1 text-sm'].join(' ')}>
              {STATUS_LABELS[order.status]}
            </span>
            <p className="text-lg font-semibold text-brand-accent">{formatPrice(order.total)}</p>
          </div>

          <div className="space-y-3">
            {order.items.length === 0 ? (
              <p className="text-sm text-brand-text-muted">Artikelpositionen werden separat nachgeladen.</p>
            ) : (
              order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="h-16 w-16 overflow-hidden rounded-lg bg-brand-bg-muted">
                    <Image
                      src={item.productImage || '/catalog/product-fallback.svg'}
                      alt={item.productName}
                      width={64}
                      height={64}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-brand-text">{item.productName}</p>
                    <p className="text-sm text-brand-text-muted">Menge: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-medium">{formatPrice(item.price * item.quantity)}</p>
                </div>
              ))
            )}
          </div>

          {order.trackingNumber ? (
            <p className="mt-4 border-t border-brand-border pt-4 text-sm text-brand-text-muted">
              Sendungsverfolgung: <span className="font-mono text-brand-accent">{order.trackingNumber}</span>
            </p>
          ) : null}
        </article>
      ))}
    </section>
  )
}
