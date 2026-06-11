// Purpose: Admin products with margin coloring (Step 8 + Step 10)
// Docs: PLAN-VERKAUFSFAEHIG.md

import { getAdminProducts } from '@/lib/actions/admin'
import { FeaturedToggle } from '../components/FeaturedToggle'
import { formatDateTime } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function AdminProductsPage() {
  const products = await getAdminProducts()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">{products.length} Produkte</h2>
        <p className="text-sm text-muted-foreground">
          Import:{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            node scripts/cj/import-products.mjs
          </code>
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left">
              <th className="px-4 py-3 font-medium">Produkt</th>
              <th className="px-4 py-3 font-medium">Einkauf (CJ)</th>
              <th className="px-4 py-3 font-medium">Verkauf</th>
              <th className="px-4 py-3 font-medium">Marge</th>
              <th className="px-4 py-3 font-medium">Bestand</th>
              <th className="px-4 py-3 font-medium">Letzter Sync</th>
              <th className="px-4 py-3 font-medium">Featured</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const cost = p.cj_cost_price ? Number(p.cj_cost_price) : null
              const price = Number(p.price)
              const margin = cost
                ? (((price - cost) / price) * 100).toFixed(0)
                : null
              const marginNum = margin != null ? Number(margin) : null
              const lowStock = p.stock <= 5

              return (
                <tr
                  key={p.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="max-w-64 truncate px-4 py-3 font-medium">
                    {p.title}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">
                    {cost !== null ? `$${cost.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums">
                    {price.toFixed(2)} €
                  </td>
                  <td className="px-4 py-3">
                    {margin !== null ? (
                      <span
                        className={
                          marginNum !== null && marginNum < 30
                            ? 'font-medium text-destructive'
                            : 'font-medium text-success'
                        }
                      >
                        {margin}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        p.stock <= 0
                          ? 'font-semibold text-destructive'
                          : lowStock
                            ? 'font-medium text-accent'
                            : ''
                      }
                    >
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {p.cj_last_synced_at
                      ? formatDateTime(p.cj_last_synced_at)
                      : 'Nie'}
                  </td>
                  <td className="px-4 py-3">
                    <FeaturedToggle
                      productId={p.id}
                      isFeatured={p.is_featured}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
