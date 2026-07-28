import Image from 'next/image'
import type { OrderItem as OrderItemData } from '@/lib/actions/orders'
import { formatEuro } from '@/lib/format'

export function OrderItems({ items }: { items: OrderItemData[] }) {
  return (
    <section className="mb-6">
      <h2 className="mb-4 text-sm font-medium">Artikel</h2>
      <ul className="flex flex-col gap-4">
        {items.map((item, index) => (
          <li key={`${item.product_id}-${item.variant_id ?? 'default'}-${index}`} className="flex items-center gap-4 rounded-lg border border-border p-3">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted">
              {item.image_url ? <Image src={item.image_url} alt={item.title || 'Produkt'} fill sizes="64px" className="object-cover" /> : null}
            </div>
            <div className="flex flex-1 flex-col gap-1"><span className="text-sm font-medium text-pretty">{item.title}</span>
              <span className="text-sm text-muted-foreground">Menge: {item.quantity} · {formatEuro(item.unit_amount)} pro Stück</span>
            </div>
            <span className="text-sm font-semibold tabular-nums">{formatEuro((item.unit_amount ?? 0) * item.quantity)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
