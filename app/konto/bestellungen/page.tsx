// Purpose: Customer order history with status badges + tracking (Step 9 + Step 10)
// Docs: PLAN-VERKAUFSFAEHIG.md
//
// RLS-scoped: nur eigene Bestellungen sichtbar. Tracking-Links via 17track.

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatEuro, formatDate, formatDateTime } from '@/lib/format'
import { PackageIcon, ExternalLinkIcon, ArrowRightIcon } from '@/components/icons'

export const dynamic = 'force-dynamic'

interface CustomerOrder {
  id: string
  amount_total: number
  status: string
  fulfillment_status: string
  tracking_number: string | null
  items: Array<{ title: string; quantity: number; unit_amount: number }>
  created_at: string
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-secondary text-secondary-foreground',
  forwarded: 'bg-primary/10 text-primary',
  shipped: 'bg-success/10 text-success',
  delivered: 'bg-success/10 text-success',
  // 'failed' ist interner Status — Kunde sieht "In Bearbeitung"
  failed: 'bg-secondary text-secondary-foreground',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'In Bearbeitung',
  forwarded: 'In Bearbeitung',
  shipped: 'Versendet',
  delivered: 'Zugestellt',
  failed: 'In Bearbeitung',
}

export default async function CustomerOrdersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: orders } = await supabase
    .from('orders')
    .select(
      'id, amount_total, status, fulfillment_status, tracking_number, items, created_at',
    )
    .order('created_at', { ascending: false })

  const orderList = (orders ?? []) as CustomerOrder[]

  if (orderList.length === 0) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <h1 className="mb-8 text-3xl font-bold tracking-tight">
          Meine Bestellungen
        </h1>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
          <PackageIcon
            className="mb-4 size-12 text-muted-foreground"
            aria-hidden
          />
          <h2 className="mb-2 text-lg font-semibold">Noch keine Bestellungen</h2>
          <p className="mb-6 max-w-sm text-pretty text-sm text-muted-foreground">
            Sobald du deine erste Bestellung aufgibst, findest du hier alle
            Details und den Sendungsstatus.
          </p>
          <Link href="/" className="btn btn-primary btn-md">
            Jetzt einkaufen
            <ArrowRightIcon className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 md:py-12">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">
        Meine Bestellungen
      </h1>
      <ul className="flex flex-col gap-4">
        {orderList.map((order) => {
          const status = order.fulfillment_status
          const statusClass =
            STATUS_STYLES[status] ?? STATUS_STYLES.pending
          const statusLabel = STATUS_LABELS[status] ?? 'In Bearbeitung'
          return (
            <li
              key={order.id}
              className="rounded-lg border border-border bg-card p-5"
            >
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-mono text-sm font-semibold">
                    Bestellung {order.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(order.created_at)}
                  </p>
                </div>
                <span
                  className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass}`}
                >
                  {statusLabel}
                </span>
              </div>

              <ul className="mb-3 flex flex-col gap-1 text-sm">
                {order.items.map((item, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span>
                      {item.quantity}× {item.title}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {formatEuro(item.unit_amount * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-semibold tabular-nums">
                  Gesamt: {formatEuro(order.amount_total)}
                </span>
                {order.tracking_number && (
                  <a
                    href={`https://t.17track.net/de#nums=${encodeURIComponent(order.tracking_number)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary underline"
                  >
                    Sendung verfolgen
                    <ExternalLinkIcon className="size-3.5" aria-hidden />
                  </a>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
