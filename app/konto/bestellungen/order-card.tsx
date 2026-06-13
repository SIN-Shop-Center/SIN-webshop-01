// Purpose: Expandable order card with line items + images (client component)
// Docs: AGENTS.md

'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { formatEuro } from '@/lib/format'
import { OrderStatusBadge, resolveOrderStatus } from '@/components/order-status-badge'
import { ChevronDownIcon, ExternalLinkIcon } from '@/components/icons'
import type { CustomerOrder } from '@/lib/actions/orders'

export function OrderCard({ order }: { order: CustomerOrder }) {
  const [expanded, setExpanded] = useState(false)
  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0)
  const status = resolveOrderStatus(order.fulfillment_status, order.status)

  return (
    <li className="rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start gap-4 p-5 text-left"
        aria-expanded={expanded}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-sm font-semibold">
                Bestellung {order.id.slice(0, 8).toUpperCase()}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(order.created_at).toLocaleDateString('de-DE', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <OrderStatusBadge status={status} />
          </div>

          <div className="mt-2 flex items-center gap-3 text-sm">
            <span className="font-semibold tabular-nums">
              {formatEuro(order.amount_total)}
            </span>
            <span className="text-muted-foreground">
              {itemCount} {itemCount === 1 ? 'Artikel' : 'Artikel'}
            </span>
          </div>

          {!expanded && (
            <p className="mt-2 truncate text-sm text-muted-foreground">
              {order.items.map((i) => i.title).join(', ')}
            </p>
          )}
        </div>

        <ChevronDownIcon
          className={`size-5 shrink-0 text-muted-foreground transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
          aria-hidden
        />
      </button>

      {expanded && (
        <div className="border-t border-border px-5 pb-5 pt-3">
          <ul className="flex flex-col gap-3">
            {order.items.map((item, i) => (
              <li
                key={i}
                className="flex items-center gap-3 text-sm"
              >
                <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-muted">
                  {item.image_url && (
                    <Image
                      src={item.image_url}
                      alt={item.title}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity}× {formatEuro(item.unit_amount)}
                  </p>
                </div>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {formatEuro(item.unit_amount * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
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
            <Link
              href={`/konto/bestellungen/${order.id}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary"
            >
              Details ansehen →
            </Link>
          </div>
        </div>
      )}
    </li>
  )
}
