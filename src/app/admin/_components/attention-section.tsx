import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import type { AdminOrder } from '@/lib/actions/admin'
import { formatEuro } from '@/lib/format'

export function AttentionSection({ failedOrders, warnings }: { failedOrders: AdminOrder[]; warnings: string[] }) {
  if (!failedOrders.length && !warnings.length) return null
  return (
    <section className="rounded-2xl border border-destructive/20 bg-destructive/[0.025]">
      <div className="flex items-center gap-2 border-b border-destructive/15 px-5 py-4 text-destructive sm:px-6">
        <AlertTriangle className="size-4" aria-hidden /><h2 className="font-semibold">Braucht Aufmerksamkeit</h2>
      </div>
      <div className="divide-y divide-destructive/10">
        {failedOrders.slice(0, 4).map((order) => (
          <Link key={order.id} href="/admin/bestellungen?filter=failed" className="flex items-center justify-between gap-4 px-5 py-4 text-sm hover:bg-destructive/5 sm:px-6">
            <span className="min-w-0 truncate">CJ-Weiterleitung fehlgeschlagen · {order.id.slice(0, 8).toUpperCase()}</span>
            <span className="shrink-0 font-semibold">{formatEuro(order.amount_total)}</span>
          </Link>
        ))}
        {warnings.slice(0, 5).map((warning) => <div key={warning} className="px-5 py-4 text-sm sm:px-6">{warning}</div>)}
      </div>
    </section>
  )
}
