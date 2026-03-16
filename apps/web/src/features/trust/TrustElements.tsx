import Link from '@/components/ui/Link'
import {
  BadgeCheck,
  HelpCircle,
  CreditCard,
  LifeBuoy,
  Receipt,
  RotateCcw,
  ShieldCheck,
  Truck,
} from 'lucide-react'
import type { TrustSignal } from '@simone/contracts'
import { cn } from '@/lib/utils'

type IconComponent = typeof ShieldCheck

const ICONS: Record<string, IconComponent> = {
  truck: Truck,
  rotate: RotateCcw,
  shield: ShieldCheck,
  payment: CreditCard,
  verified: BadgeCheck,
  support: LifeBuoy,
  receipt: Receipt,
}

type TrustPanelProps = {
  title?: string
  signals: TrustSignal[]
  compact?: boolean
  className?: string
}

function TrustIcon({ icon }: { icon: string }) {
  const Icon = ICONS[icon] || HelpCircle
  return <Icon className="h-5 w-5 text-brand-text" aria-hidden="true" />
}

export function TrustPanel({ title, signals, compact = false, className }: TrustPanelProps) {
  return (
    <section className={cn('rounded-[1.6rem] border border-brand-border bg-white/85 shadow-[0_8px_22px_rgba(10,10,10,0.05)]', className)}>
      {title ? (
        <h2 className="border-b border-brand-border px-5 py-4 text-base font-semibold text-brand-text">{title}</h2>
      ) : null}
      <ul className={cn('grid gap-3 px-5 py-4', compact ? 'sm:grid-cols-2' : 'sm:grid-cols-1')}>
        {signals.map((signal) => {
          const itemClassName = 'flex items-start gap-3 rounded-[1.15rem] border border-brand-border bg-brand-bg/55 px-3 py-3 transition-colors'
          const content = (
            <>
              <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-2xl border border-brand-border bg-brand-bg-muted/80">
                <TrustIcon icon={signal.icon} />
              </span>
              <span>
                <span className="block text-sm font-semibold text-brand-text">{signal.title}</span>
                <span className="block text-sm text-brand-text-muted">{signal.description}</span>
              </span>
            </>
          )

          return (
            <li key={signal.id}>
              {signal.href ? (
                <Link href={signal.href} className={cn(itemClassName, 'hover:bg-brand-bg-muted/80 hover:border-black/10')}>
                  {content}
                </Link>
              ) : (
                <div className={itemClassName}>{content}</div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function TrustInlineBar({ signals, className }: { signals: TrustSignal[]; className?: string }) {
  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {signals.map((signal) => (
        signal.href ? (
          <Link
            key={signal.id}
            href={signal.href}
            className="flex items-center gap-2 rounded-2xl border border-brand-border bg-white/90 px-3 py-2.5 text-sm text-brand-text transition-colors hover:bg-brand-bg-muted/60"
          >
            <TrustIcon icon={signal.icon} />
            <span>{signal.title}</span>
          </Link>
        ) : (
          <div
            key={signal.id}
            className="flex items-center gap-2 rounded-2xl border border-brand-border bg-white/90 px-3 py-2.5 text-sm text-brand-text"
          >
            <TrustIcon icon={signal.icon} />
            <span>{signal.title}</span>
          </div>
        )
      ))}
    </div>
  )
}
