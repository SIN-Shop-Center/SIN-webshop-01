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
            title: 'Attraktive Konditionen für Geschäftskunden und schnelle Lieferung.',
            copy: 'Greife auf Echtzeit-Bestände zu und plane deinen Einkauf zuverlässig.',
          },
          {
            label: 'Firmenkauf',
            title: 'Einfacher Checkout mit Rechnungskauf und optionaler PO-Nummer.',
            copy: 'Wir machen den Beschaffungsprozess so einfach und reibungslos wie möglich.',
          },
          {
            label: 'Wiederkauf',
            title: 'Dein individuelles Sortiment für schnelle und fehlerfreie Nachbestellungen.',
            copy: 'Speichere Favoriten und bestelle Verbrauchsartikel mit wenigen Klicks neu.',
          },
        ]
      : [
          {
            label: 'Geprüfte Qualität',
            title: 'Jedes Produkt in unserem Sortiment durchläuft strenge Qualitätskontrollen.',
            copy: 'Wir bieten nur Produkte an, von denen wir selbst zu 100% überzeugt sind.',
          },
          {
            label: 'Schneller Versand',
            title: 'Bestelle heute und erhalte deine Lieferung in der Regel innerhalb von 24-48 Stunden.',
            copy: 'Ab 50€ Bestellwert übernehmen wir die Versandkosten komplett für dich.',
          },
          {
            label: '30 Tage Rückgaberecht',
            title: 'Kaufe ohne Risiko. Du kannst alle Artikel innerhalb von 30 Tagen entspannt zurücksenden.',
            copy: 'Unser Kundenservice hilft dir bei Fragen jederzeit gerne und unkompliziert weiter.',
          },
        ]

  const segmentSummary =
    segment === 'b2b'
      ? 'Professionelles Equipment für dein Team. Zuverlässige Qualität und planbare Verfügbarkeit.'
      : 'Entdecke Premium-Produkte für deinen Alltag. Höchste Qualität, die überzeugt.'

  const utilityChips =
    segment === 'b2b'
      ? ['Geprüfte Qualität', 'Schneller Versand', 'Kauf auf Rechnung']
      : ['Geprüfte Qualität', 'Kostenloser Versand ab 50€', '30 Tage Rückgaberecht']

  return (
    <header className="mb-8 overflow-hidden rounded-[2rem] border border-brand-border bg-brand-surface p-6 shadow-[0_16px_40px_rgba(18,18,18,0.06)] md:p-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="section-eyebrow">{SEGMENT_LABELS[segment]}</p>
            <h1 className="mt-2 max-w-4xl text-4xl leading-tight md:text-5xl">Ausgewählte Produkte für deinen Alltag.</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-brand-text-muted">
              {segment === 'b2b'
                ? 'Statte dein Team mit den besten Tools aus. Profitiere von Firmenkonditionen und schnellem Versand.'
                : 'Entdecke unsere Kollektion aus Elektronik, Home & Living und Pflege. Höchste Qualität, die deinen Alltag besser macht.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-brand-text-muted">
              <span className="ui-pill ui-pill-muted text-xs">
                <Sparkles className="h-3.5 w-3.5" />
                Sorgfältig kuratiert
              </span>
              <span className="ui-pill ui-pill-muted text-xs">
                <Sparkles className="h-3.5 w-3.5" />
                Von Kunden exzellent bewertet
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
              hint="Finde genau das, was du suchst – in bester Qualität und sofort lieferbar."
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
