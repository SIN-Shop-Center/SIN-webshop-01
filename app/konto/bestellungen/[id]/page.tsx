// Purpose: Order detail page with timeline, reorder, and shipping info
// Docs: AGENTS.md

import Image from 'next/image'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getOrderById } from '@/lib/actions/orders'
import { resolveOrderStatus, OrderStatusBadge } from '@/components/order-status-badge'
import { formatEuro, formatDate } from '@/lib/format'
import { ReturnForm } from './return-form'
import { ReorderButton } from './reorder-button'

export const dynamic = 'force-dynamic'

const FOURTEEN_DAYS_MS = 14 * 24 * 3600 * 1000

const TIMELINE_STEPS = [
  { key: 'placed', label: 'Bestellt' },
  { key: 'confirmed', label: 'Bestätigt' },
  { key: 'shipped', label: 'Versendet' },
  { key: 'delivered', label: 'Zugestellt' },
] as const

function getActiveStep(fulfillmentStatus: string | null, paymentStatus: string): number {
  if (fulfillmentStatus === 'delivered') return 4
  if (fulfillmentStatus === 'shipped') return 3
  if (fulfillmentStatus === 'forwarded' || paymentStatus === 'paid') return 2
  return 1
}

function formatAddrLine(val: unknown): string {
  if (!val || typeof val !== 'string') return ''
  return val
}

function ShippingAddress({ address }: { address: Record<string, any> }) {
  const lines = [
    formatAddrLine(address.name),
    formatAddrLine(address.line1),
    formatAddrLine(address.line2),
    [formatAddrLine(address.postal_code), formatAddrLine(address.city)]
      .filter(Boolean)
      .join(' '),
    formatAddrLine(address.country),
  ].filter(Boolean)

  if (lines.length === 0) return null
  return (
    <address className="not-italic text-sm leading-relaxed text-muted-foreground">
      {lines.map((line, i) => (
        <span key={i}>
          {line}
          <br />
        </span>
      ))}
    </address>
  )
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const order = await getOrderById(id)
  if (!order) notFound()

  const status = resolveOrderStatus(order.fulfillment_status, order.status)
  const activeStep = getActiveStep(order.fulfillment_status, order.status)
  const within14Days =
    Date.now() - new Date(order.created_at).getTime() < FOURTEEN_DAYS_MS
  const canReturn =
    within14Days && ['paid', 'shipped', 'delivered'].includes(order.status)

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/konto/bestellungen"
        className="text-sm underline underline-offset-4"
      >
        Zurück zu meinen Bestellungen
      </Link>

      <div className="mt-4 mb-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-balance">
            Bestellung vom {formatDate(order.created_at)}
          </h1>
          <p className="text-sm text-muted-foreground">
            Nr. {order.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <OrderStatusBadge status={status} />
      </div>

      {/* ── Order Timeline ────────────────────────────────────────────── */}
      <section aria-label="Bestellstatus" className="mb-8 mt-6">
        <div className="flex items-center justify-between">
          {TIMELINE_STEPS.map((step, i) => {
            const completed = i + 1 < activeStep
            const current = i + 1 === activeStep
            return (
              <div key={step.key} className="flex flex-1 flex-col items-center">
                <div className="flex w-full items-center">
                  {i > 0 && (
                    <div
                      className={`h-0.5 flex-1 ${
                        i < activeStep ? 'bg-primary' : 'bg-border'
                      }`}
                    />
                  )}
                  <div
                    className={`flex size-8 items-center justify-center rounded-full text-xs font-bold ${
                      completed
                        ? 'bg-primary text-primary-foreground'
                        : current
                          ? 'border-2 border-primary bg-background text-primary'
                          : 'border border-border bg-muted text-muted-foreground'
                    }`}
                  >
                    {completed ? '✓' : i + 1}
                  </div>
                  {i < TIMELINE_STEPS.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 ${
                        i + 1 < activeStep ? 'bg-primary' : 'bg-border'
                      }`}
                    />
                  )}
                </div>
                <span
                  className={`mt-2 text-center text-xs ${
                    completed || current
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Tracking + Shipping ───────────────────────────────────────── */}
      {(order.tracking_number || order.shipping_address) && (
        <section className="mb-6 grid gap-4 sm:grid-cols-2">
          {order.tracking_number && (
            <div className="rounded-lg border border-border p-4">
              <h2 className="mb-2 text-sm font-medium">Sendungsverfolgung</h2>
              <a
                href={`https://t.17track.net/de#nums=${encodeURIComponent(order.tracking_number)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary underline"
              >
                {order.tracking_number}
              </a>
            </div>
          )}
          {order.shipping_address && (
            <div className="rounded-lg border border-border p-4">
              <h2 className="mb-2 text-sm font-medium">Lieferadresse</h2>
              <ShippingAddress address={order.shipping_address} />
            </div>
          )}
        </section>
      )}

      {/* ── Line Items ─────────────────────────────────────────────────── */}
      <section className="mb-6">
        <h2 className="mb-4 text-sm font-medium">Artikel</h2>
        <ul className="flex flex-col gap-4">
          {(order.items ?? []).map((item: any, i: number) => (
            <li
              key={i}
              className="flex items-center gap-4 rounded-lg border border-border p-3"
            >
              <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted">
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={item.title ?? 'Produkt'}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-sm font-medium text-pretty">
                  {item.title}
                </span>
                <span className="text-sm text-muted-foreground">
                  Menge: {item.quantity} · {formatEuro(item.unit_amount)} pro Stück
                </span>
              </div>
              <span className="text-sm font-semibold tabular-nums">
                {formatEuro((item.unit_amount ?? 0) * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Total + Actions ─────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between border-t border-border pt-4 text-base font-semibold">
        <span>Gesamt</span>
        <span>{formatEuro(order.amount_total)}</span>
      </div>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <ReorderButton orderId={order.id} />
      </div>

      {/* ── Return Request ─────────────────────────────────────────────── */}
      {canReturn && (
        <section className="rounded-lg border border-border p-6">
          <h2 className="mb-4 text-lg font-medium">Rücksendung anfragen</h2>
          <ReturnForm orderId={order.id} />
        </section>
      )}
    </main>
  )
}
