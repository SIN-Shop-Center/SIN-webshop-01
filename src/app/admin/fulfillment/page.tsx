// Purpose: Admin oversight — failed/pending CJ fulfillments with retry
// Docs: AGENTS.md

import { redirect } from 'next/navigation'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { RetryFulfillmentButton } from './retry-button'

export const metadata = { title: 'Fulfillment | Admin' }

export default async function AdminFulfillmentPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: isAdmin } = await supabase.rpc('is_admin')
  if (!isAdmin) redirect('/')

  const { data: failedOrders } = await supabase
    .from('orders')
    .select(
      'id, created_at, amount_total, fulfillment_status, fulfillment_error, fulfillment_attempts',
    )
    .eq('status', 'paid')
    .in('fulfillment_status', ['pending', 'failed'])
    .order('created_at', { ascending: true })

  const orders = failedOrders ?? []

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">Fulfillment-Probleme</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Bezahlte Bestellungen, die noch nicht erfolgreich bei CJ eingereicht wurden.
      </p>

      {orders.length === 0 ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted p-6">
          <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden />
          <p className="text-sm">
            Alle bezahlten Bestellungen sind erfolgreich bei CJ eingereicht.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => {
            const exhausted = order.fulfillment_attempts >= 5
            return (
              <li
                key={order.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-medium">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleString('de-DE')}
                    </span>
                    <span className="text-xs font-semibold">
                      {Number(order.amount_total).toFixed(2).replace('.', ',')} &euro;
                    </span>
                    {exhausted && (
                      <span className="flex items-center gap-1 rounded-full bg-sale/10 px-2 py-0.5 text-xs font-medium text-sale">
                        <AlertTriangle className="size-3" aria-hidden />
                        Max. Versuche erreicht
                      </span>
                    )}
                  </div>
                  {order.fulfillment_error && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      Fehler: {order.fulfillment_error}
                    </p>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Versuche: {order.fulfillment_attempts} / 5
                  </span>
                </div>
                <RetryFulfillmentButton orderId={order.id} />
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
