'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { Category } from '@/types'
import type { FilterState } from './ProductFilters'

const SORT_OPTIONS = [
  { value: 'popular', label: 'Beliebtheit' },
  { value: 'top-rated', label: 'Bestbewertet' },
  { value: 'fast-shipping', label: 'Schnell lieferbar' },
  { value: 'newest', label: 'Neueste zuerst' },
  { value: 'price-asc', label: 'Preis aufsteigend' },
  { value: 'price-desc', label: 'Preis absteigend' },
  { value: 'name-asc', label: 'Name A-Z' },
  { value: 'name-desc', label: 'Name Z-A' },
]

const BADGE_OPTIONS = [
  { value: 'bestseller', label: 'Bestseller' },
  { value: 'new', label: 'Neu' },
  { value: 'sale', label: 'Angebote' },
]

type ProductFiltersPanelProps = {
  categories: Category[]
  filters: FilterState
  setValue: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void
  toggleCategory: (categoryId: string) => void
  toggleBadge: (badgeId: string) => void
  toggleUseCase: (useCase: string) => void
  setMinPrice: (rawInput: string) => void
  setMaxPrice: (rawInput: string) => void
  minPrice: number
  maxPrice: number
  productCount: number
  activeFilterCount: number
  hasFilters: boolean
  clearFilters: () => void
  availableUseCases: string[]
}

export function ProductFiltersPanel({
  categories, filters, setValue, toggleCategory, toggleBadge, toggleUseCase, setMinPrice, setMaxPrice,
  minPrice, maxPrice, productCount, activeFilterCount, hasFilters, clearFilters, availableUseCases,
}: ProductFiltersPanelProps) {
  const [mobileOpen, setMobileOpen] = useState(hasFilters)
  const activeTags = useMemo(() => {
    const tags = categories.filter((category) => filters.categories.includes(category.id)).map((category) => category.name)
    if (filters.inStock === true) tags.push('Auf Lager')
    if (filters.inStock === false) tags.push('Nicht verfügbar')
    tags.push(...BADGE_OPTIONS.filter((option) => filters.featuredBadges.includes(option.value)).map((option) => option.label))
    tags.push(...filters.useCases)
    if (filters.ratingMin !== null) tags.push(`${filters.ratingMin}+ Sterne`)
    if (filters.fastDeliveryOnly) tags.push('Schnell lieferbar')
    if (filters.priceRange[0] !== minPrice || filters.priceRange[1] !== maxPrice) tags.push(`Preis ${filters.priceRange[0]}-${filters.priceRange[1]}`)
    return tags
  }, [categories, filters.categories, filters.featuredBadges, filters.fastDeliveryOnly, filters.inStock, filters.priceRange, filters.ratingMin, filters.useCases, maxPrice, minPrice])

  useEffect(() => { if (hasFilters) setMobileOpen(true) }, [hasFilters])

  return (
    <section className="sticky top-24 rounded-[1.7rem] border border-brand-border bg-white/90 p-4 shadow-[0_10px_26px_rgba(18,18,18,0.05)] md:p-5">
      <button
        type="button"
        onClick={() => setMobileOpen((current) => !current)}
        className="mb-4 flex w-full items-center justify-between rounded-[1.2rem] border border-brand-border bg-brand-surface px-4 py-3 text-left md:hidden"
      >
        <span>
          <span className="block text-sm font-semibold text-brand-text">Filter & Sortierung</span>
          <span className="block text-xs text-brand-text-muted">{activeFilterCount > 0 ? `${activeFilterCount} aktiv` : 'Keine aktiven Filter'}</span>
        </span>
        <span className="inline-flex items-center gap-2">
          {activeFilterCount > 0 ? (
            <span className="ui-pill text-xs font-semibold text-brand-text">
              {activeFilterCount}
            </span>
          ) : null}
          <ChevronDown className={['h-4 w-4 text-brand-text transition-transform', mobileOpen ? 'rotate-180' : 'rotate-0'].join(' ')} />
        </span>
      </button>
      <div className={mobileOpen ? 'block' : 'hidden md:block'}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-brand-text-muted">Katalogwerkzeuge</p>
            <h2 className="mt-2 inline-flex items-center gap-2 text-lg font-semibold text-brand-text">
              <SlidersHorizontal className="h-4 w-4 text-brand-text" />
              Sortieren & filtern
            </h2>
            <p className="mt-1 text-sm leading-6 text-brand-text-muted">{productCount} Produkte im aktuellen Zuschnitt</p>
          </div>
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Zurücksetzen
          </Button>
        </div>
        {activeTags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {activeTags.map((tag) => (
              <span key={tag} className="ui-pill ui-pill-muted text-xs">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        <div className="mt-5 space-y-5">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-brand-text-muted">Schnellauswahl</p>
            <div className="flex flex-wrap gap-2">
              {BADGE_OPTIONS.map((option) => {
                const selected = filters.featuredBadges.includes(option.value)
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleBadge(option.value)}
                    className={[
                      'ui-pill text-xs font-semibold',
                      selected ? 'ui-pill-active' : 'ui-pill-muted',
                    ].join(' ')}
                  >
                    {selected ? <Check className="h-3 w-3" /> : null}
                    {option.label}
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => setValue('fastDeliveryOnly', !filters.fastDeliveryOnly)}
                className={[
                  'ui-pill text-xs font-semibold',
                  filters.fastDeliveryOnly ? 'ui-pill-active' : 'ui-pill-muted',
                ].join(' ')}
              >
                Schnell lieferbar
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.1em] text-brand-text-muted" htmlFor="sortBy">Sortierung</label>
            <select
              id="sortBy"
              value={filters.sortBy}
              onChange={(event) => setValue('sortBy', event.target.value)}
              className="w-full rounded-[1rem] border border-brand-border bg-brand-surface px-3 py-3 text-sm text-brand-text focus:border-black focus:outline-none"
            >
              {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>

          <div className="border-t border-brand-border pt-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-brand-text-muted">Kategorien</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const selected = filters.categories.includes(category.id)
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                    aria-pressed={selected}
                    className={[
                      'ui-pill text-xs font-semibold',
                      selected ? 'ui-pill-active' : 'ui-pill-muted',
                    ].join(' ')}
                  >
                    {selected ? <Check className="h-3 w-3" /> : null}
                    {category.name}
                  </button>
                )
              })}
            </div>
          </div>

          {availableUseCases.length > 0 ? (
            <div className="border-t border-brand-border pt-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-brand-text-muted">Einsatzbereich</p>
              <div className="flex flex-wrap gap-2">
                {availableUseCases.slice(0, 8).map((useCase) => {
                  const selected = filters.useCases.includes(useCase)
                  return (
                    <button
                      key={useCase}
                      type="button"
                      onClick={() => toggleUseCase(useCase)}
                      className={[
                        'ui-pill text-xs font-semibold',
                        selected ? 'ui-pill-active' : 'ui-pill-muted',
                      ].join(' ')}
                    >
                      {selected ? <Check className="h-3 w-3" /> : null}
                      {useCase}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

          <div className="border-t border-brand-border pt-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-brand-text-muted">Preisbereich</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-brand-text-muted">Min</span>
                <input
                  type="number"
                  min={minPrice}
                  max={filters.priceRange[1]}
                  value={filters.priceRange[0]}
                  onChange={(event) => setMinPrice(event.target.value)}
                  className="w-full rounded-[1rem] border border-brand-border bg-brand-surface px-3 py-2.5 text-sm text-brand-text focus:border-black focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-brand-text-muted">Max</span>
                <input
                  type="number"
                  min={filters.priceRange[0]}
                  max={maxPrice}
                  value={filters.priceRange[1]}
                  onChange={(event) => setMaxPrice(event.target.value)}
                  className="w-full rounded-[1rem] border border-brand-border bg-brand-surface px-3 py-2.5 text-sm text-brand-text focus:border-black focus:outline-none"
                />
              </label>
            </div>
          </div>

          <div className="border-t border-brand-border pt-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-brand-text-muted">Verfügbarkeit</p>
            <div className="grid gap-2">
              {[
                { label: 'Alle Produkte', value: null as boolean | null },
                { label: 'Auf Lager', value: true },
                { label: 'Nicht verfügbar', value: false },
              ].map((option) => {
                const selected = filters.inStock === option.value
                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => setValue('inStock', option.value)}
                    className={[
                      'ui-pill w-full justify-start text-sm font-medium',
                      selected ? 'ui-pill-active' : 'ui-pill-muted',
                    ].join(' ')}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="border-t border-brand-border pt-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-brand-text-muted">Bewertung</p>
            <div className="grid gap-2">
              {[
                { label: 'Alle Bewertungen', value: null as number | null },
                { label: 'Ab 4,0 Sternen', value: 4 },
                { label: 'Ab 4,5 Sternen', value: 4.5 },
              ].map((option) => {
                const selected = filters.ratingMin === option.value
                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => setValue('ratingMin', option.value)}
                    className={[
                      'ui-pill w-full justify-start text-sm font-medium',
                      selected ? 'ui-pill-active' : 'ui-pill-muted',
                    ].join(' ')}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
