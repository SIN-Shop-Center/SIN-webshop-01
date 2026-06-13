// Purpose: Checkout step indicator — Adresse → Versand → Zahlung → Bestätigung
// Docs: PLAN-VERKAUFSFAEHIG.md

import { Check } from 'lucide-react'

const STEPS = [
  { label: 'Adresse', num: 1 },
  { label: 'Versand', num: 2 },
  { label: 'Zahlung', num: 3 },
  { label: 'Bestätigung', num: 4 },
] as const

type StepIndex = 0 | 1 | 2 | 3

export function CheckoutSteps({ current }: { current: StepIndex }) {
  return (
    <nav aria-label="Bestellfortschritt" className="mb-6">
      <ol className="flex items-center justify-center gap-0">
        {STEPS.map((step, i) => {
          const isCompleted = i < current
          const isCurrent = i === current
          return (
            <li key={step.label} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <span
                  className={`flex size-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    isCompleted
                      ? 'bg-[#047857] text-white'
                      : isCurrent
                        ? 'border-2 border-[#047857] bg-background text-[#047857]'
                        : 'border border-border bg-muted text-muted-foreground'
                  }`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isCompleted ? (
                    <Check className="size-4" aria-hidden="true" />
                  ) : (
                    step.num
                  )}
                </span>
                <span
                  className={`text-xs ${
                    isCurrent
                      ? 'font-semibold text-[#047857]'
                      : isCompleted
                        ? 'font-medium text-[#047857]'
                        : 'text-muted-foreground'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`mx-3 mb-4 h-0.5 w-10 md:w-16 ${
                    i < current ? 'bg-[#047857]' : 'bg-border'
                  }`}
                  aria-hidden="true"
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
