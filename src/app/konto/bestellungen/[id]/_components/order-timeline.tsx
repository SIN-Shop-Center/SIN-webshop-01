const TIMELINE_STEPS = [
  { key: 'placed', label: 'Bestellt' },
  { key: 'confirmed', label: 'Bestätigt' },
  { key: 'shipped', label: 'Versendet' },
  { key: 'delivered', label: 'Zugestellt' },
] as const

export function getActiveOrderStep(fulfillmentStatus: string | null, paymentStatus: string): number {
  if (fulfillmentStatus === 'delivered') return 4
  if (fulfillmentStatus === 'shipped') return 3
  if (fulfillmentStatus === 'forwarded' || paymentStatus === 'paid') return 2
  return 1
}

export function OrderTimeline({ activeStep }: { activeStep: number }) {
  return (
    <section aria-label="Bestellstatus" className="mb-8 mt-6">
      <div className="flex items-center justify-between">
        {TIMELINE_STEPS.map((step, index) => {
          const completed = index + 1 < activeStep
          const current = index + 1 === activeStep
          return (
            <div key={step.key} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                {index > 0 ? <div className={`h-0.5 flex-1 ${index < activeStep ? 'bg-primary' : 'bg-border'}`} /> : null}
                <div className={`flex size-8 items-center justify-center rounded-full text-xs font-bold ${completed ? 'bg-primary text-primary-foreground' : current ? 'border-2 border-primary bg-background text-primary' : 'border border-border bg-muted text-muted-foreground'}`}>
                  {completed ? '✓' : index + 1}
                </div>
                {index < TIMELINE_STEPS.length - 1 ? <div className={`h-0.5 flex-1 ${index + 1 < activeStep ? 'bg-primary' : 'bg-border'}`} /> : null}
              </div>
              <span className={`mt-2 text-center text-xs ${completed || current ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{step.label}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
