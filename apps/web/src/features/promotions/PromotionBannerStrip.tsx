'use client'

import { useMemo } from 'react'
import Link from '@/components/ui/Link'
import { Tag } from 'lucide-react'
import type { CustomerSegment } from '@simone/contracts'
import { useActivePromotions } from './useActivePromotions'

type PromotionPlacement = 'header' | 'pdp' | 'cart'
type Variant = 'header' | 'inline'

type PromotionBannerStripProps = {
  placement: PromotionPlacement
  segment: CustomerSegment
  variant?: Variant
  className?: string
}

const FALLBACK_COLOR = '#101010'

function safeColor(input: string | null | undefined): string {
  const color = (input || '').trim()
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color) ? color : FALLBACK_COLOR
}

export function PromotionBannerStrip({
  placement,
  segment,
  variant = 'inline',
  className = '',
}: PromotionBannerStripProps) {
  const { items, loading } = useActivePromotions(placement, segment)
  const promo = useMemo(() => items[0], [items])

  if (variant === 'header') {
    // Keep header height stable while promos load to avoid layout shift during early interactions/tests.
    if (loading || !promo) {
      return (
        <div
          className={className}
          style={{
            minHeight: '2.4rem',
            borderColor: 'transparent',
            backgroundColor: 'transparent',
          }}
          aria-hidden="true"
        />
      )
    }

    const badge = promo.code ? `Code: ${promo.code}` : 'Aktive Aktion'
    const accent = safeColor(promo.bannerColor)
    const style = {
      borderColor: `${accent}44`,
      backgroundColor: `${accent}14`,
    }

    return (
      <div className={className} style={style}>
        <div className="shell-container flex min-h-[2.4rem] items-center justify-between gap-3 text-xs font-medium text-brand-text">
          <p className="truncate">{promo.bannerText}</p>
          <span className="inline-flex flex-none items-center gap-1 rounded-full border border-current px-2 py-0.5">
            <Tag className="h-3 w-3" />
            {badge}
          </span>
        </div>
      </div>
    )
  }

  if (loading || !promo) {
    return null
  }

  const badge = promo.code ? `Code: ${promo.code}` : 'Aktive Aktion'
  const accent = safeColor(promo.bannerColor)
  const style = {
    borderColor: `${accent}44`,
    backgroundColor: `${accent}14`,
  }

  return (
    <Link href="/products" className={className}>
      <article className="rounded-2xl border px-4 py-3 text-sm text-brand-text transition-colors hover:brightness-[0.98]" style={style}>
        <p className="font-semibold">{promo.bannerText}</p>
        <p className="mt-1 text-xs text-brand-text-muted">{badge}</p>
      </article>
    </Link>
  )
}
