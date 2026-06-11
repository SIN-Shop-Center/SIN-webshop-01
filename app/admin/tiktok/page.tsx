// Purpose: Admin-Übersicht — TikTok-Publish-Status aller Produkte + Order-Status
// Docs: docs/SIN_TIKTOK_MASTER_PIPELINE.md

import { requireAdmin } from '@/lib/admin-guard'
import { createAdminClient } from '@/lib/supabase/admin'

import { PublishTikTokButton } from '../components/PublishTikTokButton'

export const dynamic = 'force-dynamic'

export default async function TikTokAdminPage() {
  await requireAdmin()
  const supabase = createAdminClient()

  const [{ data: products }, { data: orders }, { data: auth }] = await Promise.all([
    supabase
      .from('products')
      .select('id, title, tiktok_status, tiktok_product_id, tiktok_last_error, tiktok_published_at')
      .not('tiktok_status', 'is', null)
      .order('tiktok_published_at', { ascending: false, nullsFirst: false })
      .limit(100),
    supabase
      .from('tiktok_orders')
      .select('tiktok_order_id, status, cj_order_id, tracking_number, last_error, created_at')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('tiktok_auth').select('shop_id, access_token_expires_at').eq('id', 1).maybeSingle(),
  ])

  const counts = (products ?? []).reduce<Record<string, number>>((acc, p) => {
    acc[p.tiktok_status ?? 'none'] = (acc[p.tiktok_status ?? 'none'] ?? 0) + 1
    return acc
  }, {})

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-balance">TikTok Shop Pipeline</h1>
        <p className="text-sm text-muted-foreground">
          {auth?.shop_id
            ? `Verbunden mit Shop ${auth.shop_id} — Token gültig bis ${new Date(auth.access_token_expires_at).toLocaleString('de-DE')}`
            : 'Nicht verbunden — Seller-Autorisierung erforderlich (siehe Doku).'}
        </p>
      </header>

      <section aria-labelledby="status-heading" className="flex flex-col gap-3">
        <h2 id="status-heading" className="text-lg font-medium">
          Publish-Status
        </h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(counts).map(([status, count]) => (
            <div key={status} className="rounded-lg border border-border px-4 py-2">
              <span className="text-sm text-muted-foreground">{status}</span>
              <span className="ml-2 font-semibold">{count}</span>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="products-heading" className="flex flex-col gap-3">
        <h2 id="products-heading" className="text-lg font-medium">
          Produkte
        </h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="p-3 font-medium">Produkt</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">TikTok-ID</th>
                <th className="p-3 font-medium">Aktion / Fehler</th>
              </tr>
            </thead>
            <tbody>
              {(products ?? []).map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="p-3">{p.title}</td>
                  <td className="p-3">{p.tiktok_status}</td>
                  <td className="p-3 font-mono text-xs">{p.tiktok_product_id ?? '—'}</td>
                  <td className="p-3">
                    {p.tiktok_status === 'failed' ? (
                      <span className="text-xs text-destructive">{p.tiktok_last_error}</span>
                    ) : (
                      <PublishTikTokButton productId={p.id} tiktokProductId={p.tiktok_product_id} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="orders-heading" className="flex flex-col gap-3">
        <h2 id="orders-heading" className="text-lg font-medium">
          TikTok-Bestellungen
        </h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="p-3 font-medium">Order</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">CJ-Order</th>
                <th className="p-3 font-medium">Tracking</th>
              </tr>
            </thead>
            <tbody>
              {(orders ?? []).map((o) => (
                <tr key={o.tiktok_order_id} className="border-b border-border last:border-0">
                  <td className="p-3 font-mono text-xs">{o.tiktok_order_id}</td>
                  <td className="p-3">
                    {o.status}
                    {o.last_error ? (
                      <span className="block text-xs text-destructive">{o.last_error}</span>
                    ) : null}
                  </td>
                  <td className="p-3 font-mono text-xs">{o.cj_order_id ?? '—'}</td>
                  <td className="p-3 font-mono text-xs">{o.tracking_number ?? '—'}</td>
                </tr>
              ))}
              {(orders ?? []).length === 0 ? (
                <tr>
                  <td className="p-3 text-muted-foreground" colSpan={4}>
                    Noch keine TikTok-Bestellungen.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
