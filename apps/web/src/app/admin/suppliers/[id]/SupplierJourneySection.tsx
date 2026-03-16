import { getNextSupplierAction, isSupplierAutopilotReady, statusDotClass } from '../supplier-ui'
import type { AutomationHealth, SupplierDetail } from './types'

type SupplierJourneySectionProps = {
  supplier: SupplierDetail | null
  mappingCount: number
  automationHealth: AutomationHealth | null
}

type JourneyState = 'done' | 'current' | 'pending'

function journeyClasses(state: JourneyState) {
  if (state === 'done') {
    return {
      card: 'border-emerald-200 bg-emerald-50',
      title: 'text-emerald-800',
      body: 'text-emerald-700',
    }
  }
  if (state === 'current') {
    return {
      card: 'border-amber-200 bg-amber-50',
      title: 'text-amber-800',
      body: 'text-amber-700',
    }
  }
  return {
    card: 'border-brand-border bg-white',
    title: 'text-brand-text',
    body: 'text-brand-text-muted',
  }
}

export function SupplierJourneySection({ supplier, mappingCount, automationHealth }: SupplierJourneySectionProps) {
  const onboardingStatus = supplier?.onboarding_status || 'new'
  const registrationDone = onboardingStatus === 'applied' || onboardingStatus === 'awaiting_access' || onboardingStatus === 'connected'
  const manualDone = onboardingStatus === 'connected'
  const productDone = mappingCount > 0
  const autopilotReady = isSupplierAutopilotReady(supplier || {}, mappingCount, automationHealth?.ready !== false)
  const nextAction = getNextSupplierAction(supplier || {}, mappingCount)

  const steps: Array<{ title: string; body: string; state: JourneyState }> = [
    {
      title: 'Lead gesammelt',
      body: 'KI hat den Supplier in die Datenbank aufgenommen und für Review bereitgestellt.',
      state: 'done',
    },
    {
      title: 'Registrierung',
      body: 'Ein Klick startet den hybriden Registrierungs-Run gegen Portal oder API.',
      state: registrationDone ? 'done' : onboardingStatus === 'new' || onboardingStatus === 'shortlisted' ? 'current' : 'pending',
    },
    {
      title: 'Admin bestätigt',
      body: 'Nur nötig bei Verifikation, Captcha oder fehlenden Restdaten.',
      state: manualDone ? 'done' : onboardingStatus === 'awaiting_access' ? 'current' : registrationDone ? 'pending' : 'pending',
    },
    {
      title: 'Produkte zuordnen',
      body: 'Shop-Produkte bekommen Supplier-SKU, Kosten und Priorität.',
      state: productDone ? 'done' : manualDone ? 'current' : 'pending',
    },
    {
      title: 'Autopilot live',
      body: 'Nach Zahlung bestätigt die KI den Einkauf beim Supplier automatisch weiter.',
      state: autopilotReady ? 'done' : productDone && manualDone ? 'current' : 'pending',
    },
  ]

  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl">Supplier Journey</h2>
          <p className="mt-1 text-sm text-brand-text-muted">{nextAction.title}: {nextAction.detail}</p>
        </div>
        <div className="rounded-full border border-brand-border bg-white px-3 py-1 text-sm font-semibold text-brand-text">
          {automationHealth?.ready === false ? 'Globaler Autopilot eingeschränkt' : 'Globaler Autopilot bereit'}
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-5">
        {steps.map((step) => {
          const styles = journeyClasses(step.state)
          return (
            <article key={step.title} className={`rounded-2xl border p-4 ${styles.card}`}>
              <div className="flex items-center gap-2">
                <span className={statusDotClass(step.state === 'done' ? 'success' : step.state === 'current' ? 'warning' : 'neutral')} />
                <p className={`text-sm font-semibold ${styles.title}`}>{step.title}</p>
              </div>
              <p className={`mt-2 text-sm ${styles.body}`}>{step.body}</p>
            </article>
          )
        })}
      </div>
    </section>
  )
}
