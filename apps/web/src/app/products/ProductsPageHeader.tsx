import { PackageCheck, RotateCcw, Search, ShieldCheck, Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { SEGMENT_LABELS } from '@/features/segment'

type ProductsPageHeaderProps = {
  segment: 'b2c' | 'b2b'
  search: string
  onSearchChange: (next: string) => void
  onSwitchSegment: (next: 'b2c' | 'b2b') => void
}

export function ProductsPageHeader({
  segment,
  search,
  onSearchChange,
  onSwitchSegment,
}: ProductsPageHeaderProps) {
  const catalogSignals =
    segment === 'b2b'
      ? [
          {
            label: 'Preis und Bestand',
            title: 'Kosten und Verfügbarkeit bleiben vor der Freigabe sichtbar.',
            copy: 'Teams sehen direkt, was bestellbar ist und müssen nicht durch Zusatzflächen springen.',
          },
          {
            label: 'Firmenkauf',
            title: 'Relevante Firmenangaben erst dann, wenn sie gebraucht werden.',
            copy: 'USt-IdNr., Referenz und Firma bleiben außerhalb des Hauptflusses, bis sie wirklich nötig sind.',
          },
          {
            label: 'Wiederkauf',
            title: 'Suche und Filter führen schneller zur passenden Nachbestellung.',
            copy: 'Das Sortiment bleibt ruhig, damit Wiederholungskäufe nicht nach Marketplace aussehen.',
          },
        ]
      : [
          {
            label: 'Kostenklarheit',
            title: 'Preis und Lieferung sind im Sortiment früh lesbar.',
            copy: 'Besucher erkennen den Aufwand sofort und müssen nicht erst in den Checkout hinein.',
          },
          {
            label: 'Sichere Entscheidung',
            title: 'Rückgabe und Kontakt bleiben im Kaufkontext erklärt.',
            copy: 'Vertrauen entsteht über sichtbare Regeln, nicht über zusätzliche Werbeflächen.',
          },
          {
            label: 'Weniger Reibung',
            title: 'Suche, Schnellfilter und Produktkarten führen schneller zum Treffer.',
            copy: 'Die Katalogseite führt jetzt über Bestseller, Lieferung, Bewertung und Einsatzbereich.',
          },
        ]

  const segmentSummary =
    segment === 'b2b'
      ? 'Für Teams mit klarem Preisbezug, nachvollziehbarer Verfügbarkeit und wenig Reibung bis zur Bestellung.'
      : 'Für Privatkunden mit schneller Orientierung, sichtbaren Kosten und ruhigen nächsten Schritten.'

  const utilityChips =
    segment === 'b2b'
      ? ['Preis vorab sichtbar', 'Bestand direkt lesbar', 'USt-IdNr. nur bei Bedarf']
      : ['Preis vorab sichtbar', 'Lieferung 24-48h', 'Rückgabe und Kontakt klar']

  return (
    <header className="mb-8 overflow-hidden rounded-[2rem] border border-brand-border bg-brand-surface p-6 shadow-[0_16px_40px_rgba(18,18,18,0.06)] md:p-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="section-eyebrow">{SEGMENT_LABELS[segment]}</p>
            <h1 className="mt-2 max-w-4xl text-4xl leading-tight md:text-5xl">Schneller zum richtigen Produkt.</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-brand-text-muted">
              {segment === 'b2b'
                ? 'Verfügbarkeit, Preis und Wiederbestellung bleiben klar, damit Teams ohne Beschaffungschaos einkaufen können.'
                : 'Preis, Lieferung und Rückgabe sind früh sichtbar, damit du ohne Suchstress entscheiden kannst.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-brand-text-muted">
              <span className="ui-pill ui-pill-muted text-xs">
                <Sparkles className="h-3.5 w-3.5" />
                Bestseller und Schnellfilter direkt oben
              </span>
              <span className="ui-pill ui-pill-muted text-xs">
                <Sparkles className="h-3.5 w-3.5" />
                Bewertungs- und Lieferlogik im Sortiment
              </span>
            </div>
          </div>

          <div className="w-full max-w-[22rem] rounded-[1.4rem] border border-brand-border bg-white/90 p-3 md:p-4">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-brand-text-muted">Einkaufsmodus</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onSwitchSegment('b2c')}
                className={[
                  'ui-pill text-sm font-semibold',
                  segment === 'b2c' ? 'ui-pill-active' : 'ui-pill-muted',
                ].join(' ')}
              >
                Privatkunden
              </button>
              <button
                type="button"
                onClick={() => onSwitchSegment('b2b')}
                className={[
                  'ui-pill text-sm font-semibold',
                  segment === 'b2b' ? 'ui-pill-active' : 'ui-pill-muted',
                ].join(' ')}
              >
                Unternehmen
              </button>
            </div>
            <p className="mt-3 text-sm leading-6 text-brand-text-muted">{segmentSummary}</p>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-brand-border bg-white/82 p-4 md:p-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-end">
            <Input
              label="Produktsuche"
              hint="Suche direkt im Sortiment. Preis, Verfügbarkeit und Rückgabe bleiben dabei sichtbar."
              placeholder="z. B. Kopfhörer, Pflege, Haushalt"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
              className="min-h-[3.1rem] rounded-[1rem] border-brand-border bg-white"
            />
            <div className="flex flex-wrap gap-2 xl:justify-end">
              {utilityChips.map((chip) => (
                <span
                  key={chip}
                  className="ui-pill ui-pill-muted text-xs"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {catalogSignals.map((entry, index) => {
            const Icon = index === 0 ? PackageCheck : index === 1 ? ShieldCheck : RotateCcw

            return (
              <article key={entry.label} className="rounded-[1.35rem] border border-brand-border bg-white/88 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-brand-text-muted">{entry.label}</p>
                    <h2 className="mt-2 text-lg font-semibold leading-7 text-brand-text">{entry.title}</h2>
                  </div>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-brand-border bg-brand-surface text-brand-text">
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-brand-text-muted">{entry.copy}</p>
              </article>
            )
          })}
        </div>
      </div>
    </header>
  )
}
