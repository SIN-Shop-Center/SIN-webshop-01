'use client'

import { useState } from 'react'

interface ProductTabsProps {
  description: string | null
}

const TABS = ['Beschreibung', 'Versand & Rückgabe'] as const

export function ProductTabs({ description }: ProductTabsProps) {
  const [active, setActive] = useState(0)

  return (
    <div className="pt-8">
      <div role="tablist" aria-label="Produktinformationen" className="flex gap-1 border-b border-border">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            role="tab"
            aria-selected={active === i}
            aria-controls={`tab-panel-${i}`}
            id={`tab-${i}`}
            type="button"
            onClick={() => setActive(i)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              active === i
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`tab-panel-${active}`}
        aria-labelledby={`tab-${active}`}
        className="py-5 text-sm leading-relaxed text-foreground"
      >
        {active === 0 &&
          (description ? (
            <p className="whitespace-pre-line text-pretty">{description}</p>
          ) : (
            <p className="text-muted-foreground">Keine Beschreibung verfügbar.</p>
          ))}
        {active === 1 && (
          <ul className="flex flex-col gap-2">
            <li>Versand innerhalb Deutschlands: 2–5 Werktage</li>
            <li>Kostenloser Versand ab 49&nbsp;€ Bestellwert</li>
            <li>14 Tage Widerrufsrecht gemäß unserer Widerrufsbelehrung</li>
            <li>Rücksendungen bitte über den Kundenservice anmelden</li>
          </ul>
        )}
      </div>
    </div>
  )
}
