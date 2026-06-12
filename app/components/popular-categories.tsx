// Purpose: Popular categories with real product images instead of grey letter circles
// Docs: AGENTS.md

import Image from 'next/image'
import Link from 'next/link'
import { createDataClient } from '@/lib/supabase/data-client'

export async function PopularCategories() {
  const supabase = createDataClient()

  // 1) Fetch up to 200 active products with an image
  const { data: products } = await supabase
    .from('products_v')
    .select('category_id, image_url')
    .eq('is_active', true)
    .not('image_url', 'is', null)
    .limit(200)

  // 2) Pick first product image per category_id
  const seen = new Set<string>()
  const pairs: { id: string; image: string }[] = []
  for (const p of products ?? []) {
    if (!p.category_id || seen.has(p.category_id)) continue
    seen.add(p.category_id)
    pairs.push({ id: p.category_id, image: p.image_url })
    if (pairs.length >= 8) break
  }

  if (pairs.length === 0) return null

  // 3) Resolve category names in a single query
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .in('id', pairs.map((p) => p.id))

  const nameById = new Map<string, string>()
  for (const c of categories ?? []) nameById.set(c.id, c.name)

  const items = pairs
    .map((p) => ({ id: p.id, name: nameById.get(p.id) ?? '', image: p.image }))
    .filter((c) => c.name)

  if (items.length === 0) return null

  return (
    <section aria-labelledby="popular-categories" className="container mx-auto px-4 py-10">
      <h2 id="popular-categories" className="mb-6 text-2xl font-bold text-balance">
        Beliebte Kategorien
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
        {items.map((cat) => (
          <Link
            key={cat.id}
            href={`/produkte?kategorie=${cat.id}`}
            className="group flex flex-col items-center gap-2"
          >
            <div className="relative aspect-square w-full overflow-hidden rounded-full border border-border bg-muted">
              <Image
                src={cat.image || '/placeholder.svg'}
                alt=""
                fill
                sizes="(min-width: 1024px) 12vw, (min-width: 640px) 25vw, 50vw"
                className="object-cover transition-transform duration-300 group-hover:scale-110"
              />
            </div>
            <span className="line-clamp-2 text-center text-xs font-medium leading-snug text-foreground">
              {cat.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
