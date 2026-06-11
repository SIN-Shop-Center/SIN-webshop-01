// Purpose: Bestelldetailseite mit Rücksende-Integration (Issue #55)
// Docs: BGB § 312g — 14-Tage-Widerrufsrecht
//
// RLS-scope: nur eigene Bestellungen sichtbar. Service-Role nicht nötig.

import Image from 'next/image'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatEuro, formatDate } from '@/lib/format'
import { ReturnForm } from './return-form'

export const dynamic = 'force-dynamic'

const FOURTEEN_DAYS_MS = 14 * 24 * 3600 * 1000

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?next=/konto/bestellungen/${id}`)

  const { data: order } = await supabase
    .from('orders')
    .select(
      'id, created_at, amount_total, status, tracking_number, items, user_id',
    )
    .eq('id', id)
    .maybeSingle()
  if (!order) notFound()

  // Defense-in-depth: RLS filtert, aber zusätzlich prüfen
  if (order.user_id !== user.id) notFound()

  const within14Days =
    Date.now() - new Date(order.created_at).getTime() < FOURTEEN_DAYS_MS
  const canReturn = within14Days && ['paid', 'shipped', 'delivered'].includes(order.status)

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/konto/bestellungen"
        className="text-sm underline underline-offset-4"
      >
        Zurück zu meinen Bestellungen
      </Link>
      <h1 className="mt-4 mb-1 text-2xl font-semibold text-balance">
        Bestellung vom {formatDate(order.created_at)}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Nr. {order.id.slice(0, 8).toUpperCase()} · Status: {order.status}
        {order.tracking_number && (
          <>
            {' '}
            · Sendungsnummer:{' '}
            <a
              href={`https://t.17track.net/de#nums=${encodeURIComponent(order.tracking_number)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {order.tracking_number}
            </a>
          </>
        )}
      </p>

      <ul className="mb-6 flex flex-col gap-4">
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
                Menge: {item.quantity}
              </span>
            </div>
            <span className="text-sm font-semibold">
              {formatEuro((item.unit_amount ?? 0) * item.quantity)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mb-8 flex justify-between border-t border-border pt-4 text-base font-semibold">
        <span>Gesamt</span>
        <span>{formatEuro(order.amount_total)}</span>
      </div>

      {canReturn && (
        <section className="rounded-lg border border-border p-6">
          <h2 className="mb-4 text-lg font-medium">Rücksendung anfragen</h2>
          <ReturnForm orderId={order.id} />
        </section>
      )}
    </main>
  )
}
