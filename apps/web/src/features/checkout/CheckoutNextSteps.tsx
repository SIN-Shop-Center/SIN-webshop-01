import { cn } from '@/lib/utils'

const CHECKOUT_STEPS = ['Adresse angeben', 'Zahlung wählen', 'Bestellung prüfen'] as const

type CheckoutNextStepsProps = {
  title?: string
  compact?: boolean
  className?: string
}

export function CheckoutNextSteps({
  title = 'Nächster Schritt',
  compact = false,
  className,
}: CheckoutNextStepsProps) {
  return (
    <div className={cn('rounded-2xl border border-brand-border bg-white px-4 py-4', className)}>
      <p className="font-semibold text-brand-text">{title}</p>
      <div className={cn('mt-3 grid gap-2', compact ? 'sm:grid-cols-3' : '')}>
        {CHECKOUT_STEPS.map((step, index) => (
          <p
            key={step}
            className="rounded-xl border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text"
          >
            {index + 1}. {step}
          </p>
        ))}
      </div>
    </div>
  )
}
