import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SEGMENT_LABELS } from '@/features/segment'

type ProductsResultsSummaryProps = {
  count: number
  loading: boolean
  segment: 'b2c' | 'b2b'
  search: string
  activeFilterCount: number
  sortLabel: string
  onReset: () => void
}

export function ProductsResultsSummary({
  count,
  loading,
  segment,
  search,
  activeFilterCount,
  sortLabel,
  onReset,
}: ProductsResultsSummaryProps) {
  const trimmedSearch = search.trim()
  const hasRefinement = trimmedSearch.length > 0 || activeFilterCount > 0
  const productLabel = count === 1 ? 'Produkt' : 'Produkte'

  const title = loading
    ? 'Sortiment wird geladen.'
    : count === 0
      ? 'Keine passenden Produkte im aktuellen Zuschnitt.'
      : `${count} ${productLabel} sofort vergleichbar.`

  const subtitle = loading
    ? 'Preise, Lieferung und Verfügbarkeit werden für dich vorbereitet.'
    : count === 0
      ? 'Entferne Suche oder Filter, damit du wieder das volle Sortiment mit sichtbaren Kosten siehst.'
      : trimmedSearch
        ? `Treffer für "${trimmedSearch}" mit früh sichtbaren Preisen, Lieferung und Rückgabe.`
        : 'Preis, Lieferung und Rückgabe bleiben direkt im Sortiment sichtbar.'

  return (
    <div className="mb-5 rounded-[1.4rem] border border-brand-border bg-white/88 px-4 py-4 shadow-[0_10px_26px_rgba(18,18,18,0.05)] md:px-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="ui-pill ui-pill-active text-sm font-semibold">
            {loading ? '...' : count}
          </div>
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-brand-text-muted">Katalogstatus · {SEGMENT_LABELS[segment]}</p>
            <h2 className="mt-1 text-lg leading-tight text-brand-text md:text-xl">{title}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-7 text-brand-text-muted">{subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {trimmedSearch ? (
            <span className="ui-pill text-xs">
              Suche: {trimmedSearch}
            </span>
          ) : null}
          {activeFilterCount > 0 ? (
            <span className="ui-pill text-xs">
              {activeFilterCount} Filter aktiv
            </span>
          ) : null}
          <span className="ui-pill text-xs">
            Sortierung: {sortLabel}
          </span>
          <Button variant="outline" size="sm" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={onReset}>
            Alles anzeigen
          </Button>
        </div>
      </div>
    </div>
  )
}
