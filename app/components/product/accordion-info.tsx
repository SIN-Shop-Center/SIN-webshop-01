'use client'

import { useState } from 'react'
import { ChevronDown, FileText, Truck, RotateCcw, HelpCircle } from 'lucide-react'

interface AccordionSection {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  content: React.ReactNode
}

const SHIPPING_INFO = (
  <ul className="space-y-2 text-sm text-foreground">
    <li>Versand innerhalb Deutschlands: 2–5 Werktage</li>
    <li>Internationaler Versand: 7–15 Werktage</li>
    <li>Kostenloser Versand ab 50\u00a0€ Bestellwert</li>
    <li>Versandkosten unter 50\u00a0€: 4,95\u00a0€</li>
    <li>Sendungsverfolgung für jede Bestellung</li>
  </ul>
)

const RETURN_INFO = (
  <ul className="space-y-2 text-sm text-foreground">
    <li>30 Tage Widerrufsrecht ab Wareneingang</li>
    <li>Kostenlose Rücksendung innerhalb Deutschlands</li>
    <li>Rücksendungen über den Kundenservice anmelden</li>
    <li>Erstattung innerhalb von 5 Werktagen nach Eingang</li>
    <li>Artikel müssen ungetragen und mit allen Etiketten zurückgesendet werden</li>
  </ul>
)

const FAQ_ITEMS = [
  {
    q: 'Wie lange dauert die Lieferung?',
    a: 'Innerhalb Deutschlands 2–5 Werktage. Internationaler Versand dauert 7–15 Werktage, je nach Zielland.',
  },
  {
    q: 'Kann ich meine Bestellung stornieren?',
    a: 'Ja, solange die Bestellung noch nicht versendet wurde. Kontaktiere unseren Kundenservice.',
  },
  {
    q: 'Welche Zahlungsarten werden akzeptiert?',
    a: 'Visa, Mastercard, Apple Pay, Google Pay und Klarna. Alle Zahlungen werden über Stripe sicher abgewickelt.',
  },
  {
    q: 'Wie finde ich die richtige Größe?',
    a: 'Nutze unsere Größentabelle auf der Produktseite. Bei Fragen hilft unser Kundenservice gerne weiter.',
  },
]

const FAQ_CONTENT = (
  <dl className="space-y-3">
    {FAQ_ITEMS.map(({ q, a }) => (
      <div key={q}>
        <dt className="text-sm font-medium text-foreground">{q}</dt>
        <dd className="mt-1 text-sm text-muted-foreground">{a}</dd>
      </div>
    ))}
  </dl>
)

function AccordionItem({
  section,
  isOpen,
  onToggle,
}: {
  section: AccordionSection
  isOpen: boolean
  onToggle: () => void
}) {
  const Icon = section.icon
  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`accordion-panel-${section.id}`}
        className="flex w-full items-center justify-between gap-3 py-4 text-left text-sm font-medium text-foreground transition-colors hover:text-primary"
      >
        <span className="flex items-center gap-2">
          <Icon className="size-4 shrink-0 text-primary" aria-hidden />
          {section.title}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden
        />
      </button>

      <div
        id={`accordion-panel-${section.id}`}
        role="region"
        aria-labelledby={`accordion-trigger-${section.id}`}
        className={`grid transition-[grid-template-rows] duration-200 ${
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="pb-4 pl-6">{section.content}</div>
        </div>
      </div>
    </div>
  )
}

interface AccordionInfoProps {
  description: string | null
}

export function AccordionInfo({ description }: AccordionInfoProps) {
  const [openId, setOpenId] = useState<string | null>('beschreibung')

  const sections: AccordionSection[] = [
    {
      id: 'beschreibung',
      title: 'Beschreibung',
      icon: FileText,
      content: description ? (
        <p className="whitespace-pre-line text-pretty text-sm text-foreground">
          {description}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">Keine Beschreibung verfügbar.</p>
      ),
    },
    {
      id: 'versand',
      title: 'Lieferung & Versand',
      icon: Truck,
      content: SHIPPING_INFO,
    },
    {
      id: 'rueckgabe',
      title: 'Rückgabe & Widerruf',
      icon: RotateCcw,
      content: RETURN_INFO,
    },
    {
      id: 'faq',
      title: 'FAQ',
      icon: HelpCircle,
      content: FAQ_CONTENT,
    },
  ]

  return (
    <div className="rounded-lg border border-border px-4">
      {sections.map((section) => (
        <AccordionItem
          key={section.id}
          section={section}
          isOpen={openId === section.id}
          onToggle={() => setOpenId(openId === section.id ? null : section.id)}
        />
      ))}
    </div>
  )
}
