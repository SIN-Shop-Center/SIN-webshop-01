import { ChevronRight } from 'lucide-react'
import { CHECKOUT_STEPS } from '@/features/checkout/constants'
import type { CheckoutStep } from '@/features/checkout/types'

type CheckoutStepperProps = {
  currentStep: CheckoutStep
}

export function CheckoutStepper({ currentStep }: CheckoutStepperProps) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      {CHECKOUT_STEPS.map((entry, index) => (
        <div key={entry.id} className="flex items-center gap-2">
          <span
            className={[
              'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold',
              currentStep === entry.id ? 'border-black bg-black text-white' : 'border-brand-border bg-white text-brand-text-muted',
            ].join(' ')}
          >
            <entry.icon className="h-4 w-4" />
            {entry.label}
          </span>
          {index < CHECKOUT_STEPS.length - 1 ? <ChevronRight className="h-4 w-4 text-brand-text-muted" /> : null}
        </div>
      ))}
    </div>
  )
}
