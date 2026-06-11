// Purpose: Admin products with CJ cost, margin, stock, featured (Step 8)
// Docs: PLAN-VERKAUFSFAEHIG.md (Step 8 — Admin Dashboard)

import { getAdminProducts } from '@/lib/actions/admin'
import { FeaturedToggle } from '../components/FeaturedToggle'

export const dynamic = 'force-dynamic'

export default async function AdminProductsPage() {
  const products = await getAdminProducts()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{products.length} Produkte</h2>
        <p className="text-sm text-muted-foreground">
          Import:{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            node scripts/cj/import-products.mjs
          </code>
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted text-left">
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
              const margin = cost ? (((price - cost) / price) * 100).toFixed(0) : null

              return (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="max-w-64 truncate px-4 py-3 font-medium">{p.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {cost !== null ? `${cost.toFixed(2)} $` : '—'}
                  </td>
                  <td className="px-4 py-3 font-semibold">{price.toFixed(2)} €</td>
                  <td className="px-4 py-3">
                    {margin !== null ? (
                      <span className={Number(margin) < 30 ? 'text-red-600' : 'text-green-600'}>
                        {margin}%
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={p.stock <= 0 ? 'font-semibold text-red-600' : ''}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {p.cj_last_synced_at
                      ? new Date(p.cj_last_synced_at).toLocaleString('de-DE')
                      : 'Nie'}
                  </td>
                  <td className="px-4 py-3">
                    <FeaturedToggle productId={p.id} isFeatured={p.is_featured} />
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
