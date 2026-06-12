// Purpose: Sale page — show products with compare_at_price discount
// Docs: AGENTS.md

import type { Metadata } from 'next'
import { ProductCard } from '@/components/ProductCard'
import { getDealProducts } from '@/lib/queries'

export const metadata: Metadata = {
  title: 'Sale & Angebote | ShopSIN',
  description: 'Reduzierte Produkte und Blitzangebote — spare bis zu 50 % auf ausgewählte Artikel.',
}

export default async function SalePage() {
  const deals = await getDealProducts(48)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          <span className="text-sale">Sale</span> & Angebote
        </h1>
        <p className="text-sm text-muted-foreground">
          {deals.length} reduzierte {deals.length === 1 ? 'Artikel' : 'Artikel'} — solange der Vorrat reicht
        </p>
      </div>

      {deals.length === 0 ? (
        <p className="rounded-lg border border-border bg-muted p-6 text-center text-sm text-muted-foreground">
          Aktuell gibt es keine Angebote. Schau bald wieder vorbei!
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-4">
          {deals.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  )
}
