import Link from 'next/link'
import { BadgeCheck, CircleGauge, PackageSearch, ShieldAlert, Sparkles } from 'lucide-react'
import { getAdminProducts } from '@/lib/actions/admin'
import { ProductMetric } from './_components/product-status'
import { ProductTable } from './_components/product-table'

export const dynamic = 'force-dynamic'

export default async function AdminProductsPage() {
  const products = await getAdminProducts()
  const active = products.filter((product) => product.is_active).length
  const ready = products.filter((product) => product.pipeline_state === 'ready_to_publish').length
  const blocked = products.filter((product) => product.publish_blockers.length > 0).length
  const averageQuality = products.length ? Math.round(products.reduce((sum, product) => sum + product.data_quality_score, 0) / products.length) : 0

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl"><div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"><PackageSearch className="size-3.5" aria-hidden />Catalog Operations</div>
          <h1 className="text-3xl font-semibold tracking-[-0.035em]">Produkte</h1><p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">Sourcing, Datenqualität, Creative-, GPSR- und Channel-Status in einer Ansicht. Ein Produkt wird erst aktiv, wenn alle harten Gates bestanden sind.</p>
        </div>
        <div className="flex flex-wrap gap-2"><Link href="/admin/freigaben" className="btn btn-outline btn-md"><BadgeCheck className="size-4" aria-hidden />Freigaben öffnen</Link><Link href="/admin/automatisierungen" className="btn btn-primary btn-md"><Sparkles className="size-4" aria-hidden />Pipeline öffnen</Link></div>
      </header>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ProductMetric label="Gesamt" value={products.length} detail={`${active} im Shop aktiv`} icon={PackageSearch} />
        <ProductMetric label="Bereit" value={ready} detail="wartet auf Veröffentlichung" icon={BadgeCheck} />
        <ProductMetric label="Datenqualität" value={`${averageQuality}%`} detail="Durchschnitt im Katalog" icon={CircleGauge} />
        <ProductMetric label="Blockiert" value={blocked} detail="mindestens ein harter Blocker" icon={ShieldAlert} danger={blocked > 0} />
      </section>
      <ProductTable products={products} />
    </div>
  )
}
