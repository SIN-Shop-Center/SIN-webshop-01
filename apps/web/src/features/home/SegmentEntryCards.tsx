'use client'

import Link from '@/components/ui/Link'
import { ArrowRight, Building2, UserRound } from 'lucide-react'
import { useCustomerSegmentStore } from '@/features/segment'
import type { CustomerSegment } from '@simone/contracts'

const ENTRIES: Array<{
  segment: CustomerSegment
  title: string
  tag: string
  description: string
  impact: string
  href: string
  icon: typeof UserRound
}> = [
  {
    segment: 'b2c',
    title: 'Für Privatkunden',
    tag: 'Schneller Kauf',
    description: 'Klare Preisangaben, schnelle Lieferung und unkomplizierte Retoure.',
    impact: 'Schnelle Entscheidung ohne Checkout-Reibung.',
    href: '/products?segment=b2c',
    icon: UserRound,
  },
  {
    segment: 'b2b',
    title: 'Für Unternehmen',
    tag: 'Planbare Beschaffung',
    description: 'Verfügbarkeit, Firmenangaben und strukturierter Bestellprozess für Teams.',
    impact: 'Planbare Nachbestellungen und klare Ablaufe für Teams.',
    href: '/products?segment=b2b',
    icon: Building2,
  },
]

export function SegmentEntryCards() {
  const { segment, setSegment } = useCustomerSegmentStore()

  return (
    <section className="shell-container mt-10">
      <div className="grid gap-5 md:grid-cols-2">
        {ENTRIES.map((entry) => {
          const selected = segment === entry.segment
          return (
            <article
              key={entry.segment}
              className={[
                'group relative overflow-hidden rounded-[1.9rem] border p-7 transition-all duration-300 md:p-8',
                selected
                  ? 'border-black bg-white shadow-[0_22px_45px_rgba(10,10,10,0.12)]'
                  : 'border-brand-border bg-white hover:-translate-y-1 hover:border-black/15 hover:shadow-[0_18px_36px_rgba(10,10,10,0.08)]',
              ].join(' ')}
            >
              <div className="mb-5 flex items-start justify-between gap-3">
                <div
                  className={[
                    'inline-flex h-12 w-12 items-center justify-center rounded-2xl border',
                    selected ? 'border-black bg-black text-white' : 'border-brand-border bg-white text-brand-text',
                  ].join(' ')}
                >
                  <entry.icon className="h-5 w-5" />
                </div>
                <span className="trust-chip px-3 py-1 text-[0.67rem]">{selected ? 'Aktiv' : entry.tag}</span>
              </div>

              <h2 className="text-3xl leading-tight">{entry.title}</h2>
              <p className="mt-3 text-sm leading-7 text-brand-text-muted">{entry.description}</p>
              <p className="mt-5 rounded-2xl border border-brand-border bg-brand-bg px-4 py-3 text-sm font-semibold text-brand-text">
                {entry.impact}
              </p>

              <div className="mt-5 grid gap-2 text-sm text-brand-text-muted">
                {entry.segment === 'b2b' ? (
                  <>
                    <p>Preis- und Mengenklarheit für Teams.</p>
                    <p>Checkout mit USt-IdNr. und Bestellreferenz.</p>
                  </>
                ) : (
                  <>
                    <p>Schnelle Orientierung ohne Angebotschaos.</p>
                    <p>Rückgabe und Kontakt direkt im Kaufkontext sichtbar.</p>
                  </>
                )}
              </div>

              <Link
                href={entry.href}
                onClick={() => setSegment(entry.segment)}
                className={[
                  'ui-pill mt-6 gap-2 text-sm',
                  selected ? 'ui-pill-active' : 'ui-pill-muted',
                ].join(' ')}
              >
                {entry.segment === 'b2b' ? 'Firmenkauf starten' : 'Privat einkaufen'}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          )
        })}
      </div>
    </section>
  )
}
