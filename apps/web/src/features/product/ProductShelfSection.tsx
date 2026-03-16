import { ProductGrid } from '@/components/products/ProductGrid'
import type { Product } from '@/types'

type ProductShelfSectionProps = {
  eyebrow: string
  title: string
  description?: string
  products: Product[]
  columns?: 2 | 3 | 4
}

export function ProductShelfSection({
  eyebrow,
  title,
  description,
  products,
  columns = 3,
}: ProductShelfSectionProps) {
  if (products.length === 0) {
    return null
  }

  return (
    <section className="mt-14">
      <div className="mb-5 flex flex-col gap-2">
        <p className="section-eyebrow">{eyebrow}</p>
        <h2 className="text-3xl md:text-4xl">{title}</h2>
        {description ? <p className="max-w-3xl text-sm leading-7 text-brand-text-muted">{description}</p> : null}
      </div>
      <ProductGrid products={products} columns={columns} />
    </section>
  )
}
