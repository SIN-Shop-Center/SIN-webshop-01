// Purpose: Homepage sections — CategoryTiles, DealsSection
// Docs: AGENTS.md

import Link from 'next/link'
import { getCategories } from '@/lib/supabase/queries'
import { ProductCard } from './ProductCard'

export async function CategoryTiles() {
  const categories = await getCategories()

  return (
    <section aria-labelledby="cat-heading" className="border-b border-border py-8">
      <div className="container mx-auto px-4">
        <h2 id="cat-heading" className="mb-4 text-lg font-bold text-foreground">
          Beliebte Kategorien
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/kategorie/${cat.slug}`}
              className="group flex shrink-0 flex-col items-center gap-2"
            >
              <div className="flex size-16 items-center justify-center rounded-full border border-border bg-muted text-xs text-muted-foreground transition-colors group-hover:border-foreground/40 group-hover:text-foreground sm:size-20">
                {cat.name.charAt(0).toUpperCase()}
              </div>
              <span className="whitespace-nowrap text-xs text-muted-foreground group-hover:text-foreground">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
