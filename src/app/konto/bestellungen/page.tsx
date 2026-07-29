// Purpose: Customer order history with expandable cards (Step 9 + Step 10)
// Docs: AGENTS.md

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getOrders } from '@/lib/actions/orders'
import { OrderCard } from './order-card'
import { PackageIcon, ArrowRightIcon } from '@/components/icons'

export const dynamic = 'force-dynamic'

export default async function CustomerOrdersPage() {
  const orders = await getOrders()

  if (orders === null || orders.length === 0) {
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
      <ul className="flex flex-col gap-4" aria-label="Bestellliste">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </ul>
    </div>
  )
}
