// app/components/how-it-works.tsx
// Purpose: 3-Schritte-Prozess-Sektion (doktorabc-Pattern) für die Startseite.

import { Search, CreditCard, PackageCheck } from 'lucide-react'

const STEPS = [
  {
    icon: Search,
    title: 'Produkt finden',
    text: 'Stöbere durch über 50 Produkte aus Mode, Beauty, Haushalt und mehr — oder nutze die Suche.',
  },
  {
    icon: CreditCard,
    title: 'Sicher bezahlen',
    text: 'Bezahle verschlüsselt über Stripe — per Karte, Klarna oder Apple Pay & Google Pay.',
  },
  {
    icon: PackageCheck,
    title: 'Lieferung erhalten',
    text: 'Dein Paket kommt in 7–15 Werktagen mit Sendungsverfolgung. 14 Tage Widerrufsrecht inklusive.',
  },
] as const

export function HowItWorks() {
  return (
    <section aria-label="So funktioniert es" className="py-16">
      <div className="mx-auto w-full max-w-7xl px-4">
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-balance">
          In 3 einfachen Schritten <span className="text-primary">zu deiner Bestellung</span>
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="relative rounded-xl border border-border bg-card p-8 text-center"
            >
              <span
                aria-hidden="true"
                className="absolute -top-4 left-1/2 flex size-8 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
              >
                {i + 1}
              </span>
              <step.icon className="mx-auto mb-4 size-10 text-primary" aria-hidden="true" />
              <h3 className="text-lg font-bold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
                {step.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
