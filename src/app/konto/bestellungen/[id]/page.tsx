// Purpose: Order detail page with timeline, reorder, and shipping info
// Docs: AGENTS.md

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { OrderStatusBadge, resolveOrderStatus } from '@/components/order-status-badge'
import { getOrderById } from '@/lib/actions/orders'
import { formatDate, formatEuro } from '@/lib/format'
import { OrderItems } from './_components/order-items'
import { OrderShipping } from './_components/order-shipping'
import { getActiveOrderStep, OrderTimeline } from './_components/order-timeline'
import { ReorderButton } from './reorder-button'
import { ReturnForm } from './return-form'

export const dynamic = 'force-dynamic'
const FOURTEEN_DAYS_MS = 14 * 24 * 3600 * 1000

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const order = await getOrderById(id)
  if (!order) notFound()

  const status = resolveOrderStatus(order.fulfillment_status, order.status)
  const activeStep = getActiveOrderStep(order.fulfillment_status, order.status)
  const within14Days = Date.now() - new Date(order.created_at).getTime() < FOURTEEN_DAYS_MS
  const canReturn = within14Days && ['paid', 'shipped', 'delivered'].includes(order.status)

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <Link href="/konto/bestellungen" className="text-sm underline underline-offset-4">Zurück zu meinen Bestellungen</Link>
      <div className="mt-4 mb-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-semibold text-balance">Bestellung vom {formatDate(order.created_at)}</h1><p className="text-sm text-muted-foreground">Nr. {order.id.slice(0, 8).toUpperCase()}</p></div>
        <OrderStatusBadge status={status} />
      </div>
      <OrderTimeline activeStep={activeStep} />
      <OrderShipping trackingNumber={order.tracking_number} address={order.shipping_address} />
      <OrderItems items={order.items ?? []} />
      <div className="mb-6 flex items-center justify-between border-t border-border pt-4 text-base font-semibold"><span>Gesamt</span><span>{formatEuro(order.amount_total)}</span></div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><ReorderButton orderId={order.id} /></div>
      {canReturn ? <section className="rounded-lg border border-border p-6"><h2 className="mb-4 text-lg font-medium">Rücksendung anfragen</h2><ReturnForm orderId={order.id} /></section> : null}
    </main>
  )
}
