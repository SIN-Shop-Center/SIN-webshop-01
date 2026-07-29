// Purpose: Visual checkout progress indicator
// Docs: AGENTS.md

import { Check } from 'lucide-react'

const steps = ['Warenkorb', 'Kasse', 'Bestätigung']

export function CheckoutSteps({ current }: { current: 0 | 1 | 2 }) {
  return (
    <nav aria-label="Bestellfortschritt" className="mb-6">
      <ol className="flex items-center justify-center gap-0">
        {steps.map((step, i) => (
          <li key={step} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <span
                className={`flex size-7 items-center justify-center rounded-full text-xs font-bold ${
                  i < current
                    ? 'bg-primary text-primary-foreground'
                    : i === current
                      ? 'border-2 border-primary bg-background text-primary'
                      : 'border border-border bg-muted text-muted-foreground'
                }`}
                aria-current={i === current ? 'step' : undefined}
              >
                {i < current ? <Check className="size-3.5" aria-hidden="true" /> : i + 1}
              </span>
              <span className={`text-xs ${i === current ? 'font-semibold' : 'text-muted-foreground'}`}>{step}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`mx-2 mb-4 h-0.5 w-12 md:w-20 ${i < current ? 'bg-primary' : 'bg-border'}`} aria-hidden="true" />
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
