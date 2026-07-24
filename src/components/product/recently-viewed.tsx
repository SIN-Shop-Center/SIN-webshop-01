import { cookies } from 'next/headers'
import { createDataClient } from '@/lib/supabase/data-client'
import { ProductCard } from '@/components/ProductCard'
import type { Product } from '@/lib/data'

export async function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const cookieStore = await cookies()
  const raw = cookieStore.get('recently_viewed')?.value
  if (!raw) return null

  const ids = raw.split(',').filter((id) => id && id !== excludeId).slice(0, 8)
  if (ids.length === 0) return null

  const supabase = createDataClient()
  const { data: products } = await supabase
    .from('products_v')
    .select('*')
    .eq('is_active', true)
    .in('id', ids)

  if (!products || products.length === 0) return null

  const ordered = ids
    .map((id) => products.find((p: any) => p.id === id))
    .filter(Boolean) as Product[]

  return (
    <section aria-labelledby="recently-viewed" className="container mx-auto px-4 py-10">
      <h2 id="recently-viewed" className="mb-6 text-2xl font-bold">
        Zuletzt angesehen
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {ordered.map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} />
        ))}
      </div>
    </section>
  )
}
