'use client'

import { motion } from 'framer-motion'
import { ProductCard } from './ProductCard'
import { ProductSkeleton } from './ProductSkeleton'
import type { Product } from '@/types'

interface ProductGridProps {
  products: Product[]
  loading?: boolean
  columns?: 2 | 3 | 4
  emptyMessage?: string
  emptyHint?: string
  emptyActionLabel?: string
  onEmptyAction?: () => void
}

const GRID_COLUMNS = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4',
} as const

const SKELETON_KEYS = [0, 1, 2, 3, 4, 5, 6, 7] as const

export function ProductGrid({
  products,
  loading = false,
  columns = 4,
  emptyMessage = 'Keine Produkte gefunden.',
  emptyHint,
  emptyActionLabel,
  onEmptyAction,
}: ProductGridProps) {
  if (loading) {
    return (
      <div className={`grid ${GRID_COLUMNS[columns]} gap-5`}>
        {SKELETON_KEYS.map((key) => (
          <ProductSkeleton key={key} />
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-[1.8rem] border border-brand-border bg-white px-6 py-14 text-center"
      >
        <p className="text-2xl font-semibold text-brand-text">{emptyMessage}</p>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-brand-text-muted">
          {emptyHint || 'Passe Suche, Segment oder Filter an. Preise und Verfügbarkeiten werden direkt in der Liste aktualisiert.'}
        </p>
        {emptyActionLabel && onEmptyAction ? (
          <button
            type="button"
            onClick={onEmptyAction}
            className="ui-pill ui-pill-muted mt-5 text-sm font-semibold"
          >
            {emptyActionLabel}
          </button>
        ) : null}
      </motion.div>
    )
  }

  return (
    <div className={`grid ${GRID_COLUMNS[columns]} gap-5`}>
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} index={index} />
      ))}
    </div>
  )
}

interface FeaturedGridProps {
  products: Product[]
  title?: string
  subtitle?: string
}

export function FeaturedGrid({ products, title, subtitle }: FeaturedGridProps) {
  if (products.length === 0) {
    return null
  }

  const [featured, ...rest] = products

  return (
    <div className="space-y-6">
      {title || subtitle ? (
        <div className="text-center">
          {title ? <h2 className="text-3xl">{title}</h2> : null}
          {subtitle ? <p className="mt-2 text-brand-text-muted">{subtitle}</p> : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ProductCard product={featured} index={0} />
        </div>
        {rest.slice(0, 4).map((product, index) => (
          <ProductCard key={product.id} product={product} index={index + 1} />
        ))}
      </div>
    </div>
  )
}
