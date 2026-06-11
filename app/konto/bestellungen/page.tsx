// Purpose: Customer order history (Step 9 of migration)
// Docs: PLAN-VERKAUFSFAEHIG.md (Step 9 — Customer orders + shipping)
//
// RLS-scoped: nur eigene Bestellungen sichtbar (auth.uid() = user_id
// ODER verifizierte E-Mail matcht). Tracking-Links via 17track.

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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

const STATUS_LABELS: Record<string, string> = {
  pending: 'In Bearbeitung',
  forwarded: 'In Bearbeitung',
  shipped: 'Versendet',
  delivered: 'Zugestellt',
  // 'failed' ist ein interner Status — Kunde sieht "In Bearbeitung",
  // während der Admin retried (siehe /admin).
  failed: 'In Bearbeitung',
}

export default async function CustomerOrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // RLS sorgt dafür, dass nur eigene Bestellungen zurückkommen
  const { data: orders } = await supabase
    .from('orders')
    .select('id, amount_total, status, fulfillment_status, tracking_number, items, created_at')
    .order('created_at', { ascending: false })

  const orderList = (orders ?? []) as CustomerOrder[]

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">Meine Bestellungen</h1>

      {orderList.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted p-8 text-center">
          <p className="mb-4 text-muted-foreground">
            Du hast noch keine Bestellungen.
          </p>
          <Link href="/" className="font-medium text-primary underline">
            Jetzt einkaufen
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {orderList.map((order) => (
            <div key={order.id} className="rounded-lg border border-border p-5">
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="font-mono text-sm font-semibold">
                    Bestellung {order.id.slice(0, 8).toUpperCase()}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <span className="inline-block w-fit rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                  {STATUS_LABELS[order.fulfillment_status] ?? 'In Bearbeitung'}
                </span>
              </div>

              <ul className="mb-3 flex flex-col gap-1 text-sm">
                {order.items.map((item, i) => (
                  <li key={i} className="flex justify-between">
                    <span>
                      {item.quantity}x {item.title}
                    </span>
                    <span className="text-muted-foreground">
                      {((item.unit_amount * item.quantity) / 100).toFixed(2)} €
                    </span>
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="font-semibold">
                  Gesamt: {(order.amount_total / 100).toFixed(2)} €
                </span>
                {order.tracking_number && (
                  <a
                    href={`https://t.17track.net/de#nums=${encodeURIComponent(order.tracking_number)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary underline"
                  >
                    Sendung verfolgen
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
