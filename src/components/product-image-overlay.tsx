import { Flame, Star, Truck, Sparkles, TrendingUp } from 'lucide-react'
import type { ProductBadge, BadgeVariant } from '@/lib/product-badges'

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  sale: 'bg-sale text-sale-foreground',
  urgency: 'bg-foreground/90 text-background',
  highlight: 'bg-rating text-foreground',
  trust: 'bg-success text-background',
  info: 'bg-background/90 text-foreground backdrop-blur-sm',
}

function BadgeIcon({ badge }: { badge: ProductBadge }) {
  if (badge.id === 'top-rated') return <Star className="size-3 fill-current" aria-hidden />
  if (badge.id === 'free-shipping') return <Truck className="size-3" aria-hidden />
  const icons: Record<string, typeof Flame> = { urgency: Flame, highlight: TrendingUp, info: Sparkles }
  const Icon = icons[badge.variant]
  return Icon ? <Icon className="size-3" aria-hidden /> : null
}

export function ProductImageOverlay({ badges, size = 'sm' }: { badges: ProductBadge[]; size?: 'sm' | 'lg' }) {
  if (badges.length === 0) return null
  const sizeClasses = size === 'lg' ? 'px-2.5 py-1 text-xs gap-1.5' : 'px-2 py-0.5 text-[11px] gap-1'
  return (
    <div className="pointer-events-none absolute left-2 top-2 z-10 flex flex-col items-start gap-1.5">
      {badges.map((badge) => (
        <span key={badge.id} className={`inline-flex items-center rounded-md font-semibold leading-tight shadow-sm ${sizeClasses} ${VARIANT_STYLES[badge.variant]}`}>
          <BadgeIcon badge={badge} />
          {badge.label}
        </span>
      ))}
    </div>
  )
}
