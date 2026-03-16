'use client'

import Link from '@/components/ui/Link'
import { ArrowRight } from 'lucide-react'
import { ProductGrid } from '@/components/products/ProductGrid'

type HomeCollectionSectionProps = {
  eyebrow: string
  title: string
  description: string
  ctaLabel: string
  ctaHref: string
  emptyMessage: string
  products: Parameters<typeof ProductGrid>[0]['products']
}

export function HomeCollectionSection({
  eyebrow,
  title,
  description,
  ctaLabel,
  ctaHref,
  emptyMessage,
  products,
}: HomeCollectionSectionProps) {
  return (
    <section className="shell-container mt-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="section-eyebrow">{eyebrow}</p>
          <h2 className="mt-2 text-3xl md:text-4xl">{title}</h2>
          <p className="mt-3 text-sm leading-7 text-brand-text-muted">{description}</p>
        </div>
        <Link href={ctaHref} className="cta-secondary inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-150">
          <span>{ctaLabel}</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <ProductGrid products={products} columns={4} emptyMessage={emptyMessage} />
    </section>
  )
}
