import Link from 'next/link'
import { AlertTriangle, ArrowUpRight, PackageSearch } from 'lucide-react'
import type { AdminProduct } from '@/lib/actions/admin'
import { formatDateTime } from '@/lib/format'
import { FeaturedToggle } from '../../components/FeaturedToggle'
import { StatusPill } from './product-status'

function ProductRow({ product }: { product: AdminProduct }) {
  const cost = product.cj_cost_price
  const margin = cost && product.price > 0 ? Math.round(((product.price - cost) / product.price) * 100) : null
  const lowStock = product.stock <= 5
  return (
    <tr className="border-b border-border align-top last:border-0 hover:bg-muted/20">
      <td className="max-w-80 px-6 py-4"><div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-muted/40">
          {product.images[0] ? <img src={product.images[0]} alt="" className="size-full object-cover" /> : <PackageSearch className="size-4 text-muted-foreground" aria-hidden />}
        </div>
        <div className="min-w-0"><p className="line-clamp-2 font-medium leading-5">{product.title}</p>
          <div className="mt-2 flex flex-wrap gap-1.5"><StatusPill value={product.is_active ? 'published' : 'inactive'} /><StatusPill value={product.risk_level} /></div>
          {product.publish_blockers.length ? <details className="mt-2 text-xs text-destructive"><summary className="cursor-pointer font-medium">{product.publish_blockers.length} Blocker</summary>
            <ul className="mt-1 space-y-1 text-[11px] leading-4">{product.publish_blockers.slice(0, 6).map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
          </details> : null}
        </div>
      </div></td>
      <td className="px-4 py-4"><div className="flex max-w-52 flex-wrap gap-1.5"><StatusPill value={product.pipeline_state} /><StatusPill value={product.approval_state} /><StatusPill value={`creative: ${product.creative_status}`} /></div></td>
      <td className="px-4 py-4"><div className="flex items-center gap-2"><div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-foreground" style={{ width: `${Math.max(0, Math.min(100, product.data_quality_score))}%` }} /></div><span className="text-xs font-semibold tabular-nums">{product.data_quality_score}%</span></div></td>
      <td className="px-4 py-4"><p className="font-semibold tabular-nums">{product.price.toFixed(2)} €</p><p className={`mt-1 text-xs tabular-nums ${margin !== null && margin < 30 ? 'text-destructive' : 'text-muted-foreground'}`}>{cost !== null ? `$${cost.toFixed(2)} · ${margin}% Marge` : 'Kein CJ-Preis'}</p></td>
      <td className="px-4 py-4"><span className={product.stock <= 0 ? 'font-semibold text-destructive' : lowStock ? 'font-medium text-accent' : 'font-medium'}>{product.stock}</span></td>
      <td className="px-4 py-4"><StatusPill value={product.tiktok_status} />{product.tiktok_product_id ? <p className="mt-1 max-w-32 truncate text-[10px] text-muted-foreground">{product.tiktok_product_id}</p> : null}</td>
      <td className="px-4 py-4 text-xs text-muted-foreground">{product.cj_last_synced_at ? formatDateTime(product.cj_last_synced_at) : 'Nie'}</td>
      <td className="px-4 py-4"><FeaturedToggle productId={product.id} isFeatured={product.is_featured} /></td>
    </tr>
  )
}

export function ProductTable({ products }: { products: AdminProduct[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-col gap-2 border-b border-border px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div><h2 className="font-semibold tracking-tight">Produktkatalog</h2><p className="mt-1 text-xs text-muted-foreground">Manuelle Direktimporte bleiben inaktiv und durchlaufen dieselbe Freigabekette.</p></div>
        <code className="rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-[11px] text-muted-foreground">pnpm pipeline:cj-top10</code>
      </div>
      {products.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1180px] text-sm">
        <thead><tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">{['Produkt','Readiness','Qualität','Preis / Marge','Bestand','TikTok','CJ Sync','Featured'].map((label) => <th key={label} className="px-4 first:px-6 py-3 font-medium">{label}</th>)}</tr></thead>
        <tbody>{products.map((product) => <ProductRow key={product.id} product={product} />)}</tbody>
      </table></div> : <div className="grid min-h-56 place-items-center px-6 text-center"><div><AlertTriangle className="mx-auto size-5 text-muted-foreground" aria-hidden /><p className="mt-2 text-sm font-medium">Noch keine Produkte vorhanden</p><p className="mt-1 text-xs text-muted-foreground">Starte die Trend- und CJ-Pipeline über Automatisierungen.</p><Link href="/admin/automatisierungen" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold hover:underline">Automatisierungen öffnen <ArrowUpRight className="size-3.5" aria-hidden /></Link></div></div>}
    </section>
  )
}
