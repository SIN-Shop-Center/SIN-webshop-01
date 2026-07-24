import { getRelatedProducts } from '@/lib/supabase/queries'
import { ProductCard } from './ProductCard'

export async function RelatedProducts({
  productId,
  categoryId,
}: {
  productId: string
  categoryId: string | null
}) {
  const products = await getRelatedProducts(productId, categoryId)
  if (products.length === 0) return null

  return (
    <section aria-labelledby="related-heading" className="pt-12">
      <h2 id="related-heading" className="pb-4 text-xl font-bold text-foreground">
        Das könnte dir auch gefallen
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {products.map((p, i) => (
          <ProductCard key={p.id} product={p} index={i} />
        ))}
      </div>
    </section>
  )
}
