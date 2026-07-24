'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ChevronDown, FileText, HelpCircle, RotateCcw, Truck } from 'lucide-react'
import { SHIPPING } from '@/lib/shipping-constants'
import { formatEuro } from '@/lib/format'

interface AccordionSection {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  content: React.ReactNode
}

const SHIPPING_INFO = (
  <div className="space-y-3 text-sm leading-6">
    <ul className="space-y-1.5">
      <li>Lieferzeit: üblicherweise {SHIPPING.deliveryDaysMin}–{SHIPPING.deliveryDaysMax} Werktage.</li>
      <li>Versandfrei ab {formatEuro(SHIPPING.freeAboveCents)} Bestellwert.</li>
      <li>Unterhalb des Schwellenwerts werden die tatsächlichen Versandkosten im Checkout angezeigt.</li>
      <li>Lieferland, Versandart und Prognose werden vor der Zahlung bei Stripe bestätigt.</li>
    </ul>
    <Link href="/hilfe/versand" className="inline-flex text-sm font-medium underline underline-offset-4">
      Versandinformationen öffnen
    </Link>
  </div>
)

const RETURN_INFO = (
  <div className="space-y-3 text-sm leading-6">
    <p>
      Für Verbraucher gilt grundsätzlich das gesetzliche 14-tägige Widerrufsrecht. Ausnahmen,
      Fristbeginn, Rücksendekosten und Ablauf stehen in den vollständigen Hinweisen.
    </p>
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      <Link href="/widerrufsrecht" className="font-medium underline underline-offset-4">
        Widerrufsbelehrung
      </Link>
      <Link href="/hilfe/rueckgabe" className="font-medium underline underline-offset-4">
        Rückgabehilfe
      </Link>
    </div>
  </div>
)

const FAQ_ITEMS = [
  {
    q: 'Wie lange dauert die Lieferung?',
    a: `Üblicherweise ${SHIPPING.deliveryDaysMin}–${SHIPPING.deliveryDaysMax} Werktage. Die konkrete Prognose steht vor der Zahlung im Checkout.`,
  },
  {
    q: 'Kann ich meine Bestellung stornieren?',
    a: 'Kontaktiere den Kundenservice möglichst sofort. Ob eine Stornierung noch möglich ist, hängt vom Bearbeitungs- und Versandstatus ab.',
  },
  {
    q: 'Welche Zahlungsarten sind verfügbar?',
    a: 'Stripe zeigt im Checkout die für Land, Gerät und Bestellung tatsächlich verfügbaren Zahlungsarten an.',
  },
  {
    q: 'Wo finde ich produktspezifische Sicherheits- und Verantwortlichenangaben?',
    a: 'Verifizierte Hersteller- und EU-Verantwortlichenangaben stehen direkt auf der jeweiligen Produktseite.',
  },
]

const FAQ_CONTENT = (
  <dl className="space-y-4">
    {FAQ_ITEMS.map(({ q, a }) => (
      <div key={q}>
        <dt className="text-sm font-medium">{q}</dt>
        <dd className="mt-1 text-sm leading-6 text-muted-foreground">{a}</dd>
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
  const triggerId = `accordion-trigger-${section.id}`
  const panelId = `accordion-panel-${section.id}`

  return (
    <div className="border-b border-border last:border-0">
      <button
        id={triggerId}
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 py-4 text-left text-sm font-medium transition-colors hover:text-foreground/70"
      >
        <span className="flex items-center gap-2.5">
          <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          {section.title}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        hidden={!isOpen}
      >
        <div className="pb-5 pl-6 text-muted-foreground">{section.content}</div>
      </div>
    </div>
  )
}

export function AccordionInfo({ description }: { description: string | null }) {
  const [openId, setOpenId] = useState<string | null>('beschreibung')

  const sections: AccordionSection[] = [
    {
      id: 'beschreibung',
      title: 'Beschreibung',
      icon: FileText,
      content: description ? (
        <p className="whitespace-pre-line text-pretty text-sm leading-6 text-foreground">
          {description}
        </p>
      ) : (
        <p className="text-sm">Keine Beschreibung verfügbar.</p>
      ),
    },
    {
      id: 'versand',
      title: 'Lieferung und Versand',
      icon: Truck,
      content: SHIPPING_INFO,
    },
    {
      id: 'rueckgabe',
      title: 'Rückgabe und Widerruf',
      icon: RotateCcw,
      content: RETURN_INFO,
    },
    {
      id: 'faq',
      title: 'Häufige Fragen',
      icon: HelpCircle,
      content: FAQ_CONTENT,
    },
  ]

  return (
    <div className="rounded-xl border border-border px-4">
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
