'use client'

import Link from '@/components/ui/Link'
import { ArrowRight } from 'lucide-react'
import { SEGMENT_COPY, SEGMENT_LABELS } from '@/features/segment'
import { cn } from '@/lib/utils'
import type { CustomerSegment } from '@simone/contracts'

type HeroSectionProps = {
  segment: CustomerSegment
  variant?: 'control' | 'trust'
}

export function HeroSection({ segment, variant = 'control' }: HeroSectionProps) {
  const copy = SEGMENT_COPY[segment]
  const primaryLinkClassName = cn(
    'cta-primary inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-full px-7 py-3 text-base font-semibold shadow-sm transition-all duration-150',
  )
  const secondaryLinkClassName = cn(
    'cta-secondary inline-flex min-h-[3rem] items-center justify-center rounded-full px-7 py-3 text-base font-semibold transition-all duration-150',
  )
  const quickFacts =
    segment === 'b2b'
      ? [
          { label: 'Firmenkauf', value: 'USt-IdNr. und Referenz möglich' },
          { label: 'Verfügbarkeit', value: 'Vor dem Kauf klar sichtbar' },
          { label: 'Kontakt', value: 'In der Regel innerhalb von 24 Stunden' },
        ]
      : [
          { label: 'Lieferung', value: '24-48 Stunden bei verfügbaren Artikeln' },
          { label: 'Rückgabe', value: '30 Tage klar erklärt' },
          { label: 'Kontakt', value: 'In der Regel innerhalb von 24 Stunden' },
        ]
  const heroProofs =
    segment === 'b2b'
      ? [
          ['Verfügbarkeit vor dem Checkout', 'Preis, Menge und Lieferlogik bleiben früh sichtbar.'],
          ['Firmenkauf ohne Umweg', 'Bestellreferenz und USt-IdNr. erst dort, wo sie gebraucht werden.'],
          ['Wiederbestellung vorbereitet', 'Das Erlebnis bleibt klar für Teams mit wiederkehrendem Bedarf.'],
        ]
      : [
          ['Preis und Lieferung sofort klar', 'Kein Ratespiel bis zur Kasse. Die wichtigen Fakten kommen früh.'],
          ['Rückgabe direkt erklärt', 'Retouren und Hilfe stehen im Kaufmoment bereit, nicht versteckt im Footer.'],
          ['Weniger Reibung bis zur Kasse', 'Produkt, Warenkorb und Checkout führen ruhig und direkt weiter.'],
        ]
  const title =
    variant === 'trust'
      ? `${copy.heroTitle} Ohne versteckte Hürden im Checkout.`
      : copy.heroTitle
  const subtitle =
    variant === 'trust'
      ? `${copy.heroSubtitle} Preise, Lieferung und Rückgabe bleiben vom ersten Klick bis zum Checkout klar sichtbar.`
      : copy.heroSubtitle

  return (
    <section className="shell-container pt-8 md:pt-12">
      <div className="overflow-hidden rounded-[2rem] border border-brand-border bg-brand-surface shadow-[var(--shadow-card)]">
        <div className="grid gap-10 px-6 py-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:px-10 lg:py-12">
          <div className="animate-reveal">
            <p className="kicker-badge">
              <span className="inline-flex h-2 w-2 rounded-full bg-black animate-pulse-soft" />
              {copy.heroKicker}
            </p>

            <h1 className="mt-5 max-w-4xl text-balance text-4xl leading-tight md:text-[4.25rem]">{title}</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-brand-text-muted md:text-lg">{subtitle}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              {copy.trustFocus.slice(0, 3).map((entry) => (
                <span key={entry} className="trust-chip px-3 py-1.5 text-xs">
                  {entry}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/products" className={primaryLinkClassName}>
                <span>{copy.primaryCta}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href={segment === 'b2b' ? '/versand' : '/rueckgabe'} className={secondaryLinkClassName}>
                {copy.secondaryCta}
              </Link>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {quickFacts.map((fact) => (
                <div key={fact.label} className="rounded-2xl border border-brand-border bg-white px-4 py-4">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-brand-text-muted">{fact.label}</p>
                  <p className="mt-2 text-base font-semibold text-brand-text">{fact.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="animate-float">
            <div className="panel-elevated grid gap-4 p-5 md:p-6">
              <div className="rounded-[1.6rem] border border-brand-border bg-black px-5 py-5 text-white">
                <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-white/70">
                  Was Besucher sofort spüren
                </p>
                <h2 className="mt-3 text-2xl leading-tight">Nutzen in den ersten Sekunden.</h2>
                <p className="mt-3 text-sm leading-7 text-white/78">
                  {segment === 'b2b'
                    ? 'Teams sehen schnell, ob ein Produkt passt und wie der Kauf ohne Zusatzschleifen abläuft.'
                    : 'Besucher verstehen schnell, warum ein Produkt passt und wie sie ohne Reibung zur Kasse kommen.'}
                </p>
              </div>

              <div className="grid gap-3">
                {heroProofs.map(([title, text]) => (
                  <article key={title} className="rounded-[1.4rem] border border-brand-border bg-white px-4 py-4">
                    <p className="text-sm font-semibold text-brand-text">{title}</p>
                    <p className="mt-1 text-sm leading-6 text-brand-text-muted">{text}</p>
                  </article>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.4rem] border border-brand-border bg-brand-bg px-4 py-4">
                  <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-brand-text-muted">
                    Checkout
                  </p>
                  <p className="mt-2 text-xl font-semibold text-brand-text">3 klare Schritte</p>
                  <p className="mt-1 text-sm leading-6 text-brand-text-muted">
                    Adresse, Zahlung und Bestellprüfung. Mehr nicht.
                  </p>
                </div>
                <div className="rounded-[1.4rem] border border-brand-border bg-brand-bg px-4 py-4">
                  <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-brand-text-muted">
                    Einkaufsmodus
                  </p>
                  <p className="mt-2 text-xl font-semibold text-brand-text">{SEGMENT_LABELS[segment]}</p>
                  <p className="mt-1 text-sm leading-6 text-brand-text-muted">
                    Ein klarer Modus statt gemischter Signale für Privat und Geschäft.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
