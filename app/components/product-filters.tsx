'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { SlidersHorizontal } from 'lucide-react'

const SORT_OPTIONS = [
  { value: 'beliebt', label: 'Beliebteste' },
  { value: 'neu', label: 'Neuheiten' },
  { value: 'preis-auf', label: 'Preis aufsteigend' },
  { value: 'preis-ab', label: 'Preis absteigend' },
  { value: 'bewertung', label: 'Beste Bewertung' },
] as const

export function ProductFilters({ totalCount }: { totalCount: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === null || value === '') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    params.delete('seite')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <span className="flex items-center gap-1.5 text-sm font-medium">
        <SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden />
        {totalCount} Artikel
      </span>

      <div className="ml-auto flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            checked={searchParams.get('sale') === '1'}
            onChange={(e) => updateParam('sale', e.target.checked ? '1' : null)}
            className="size-4 rounded border-border accent-primary"
          />
          Nur Sale
        </label>

        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            checked={searchParams.get('verfuegbar') === '1'}
            onChange={(e) => updateParam('verfuegbar', e.target.checked ? '1' : null)}
            className="size-4 rounded border-border accent-primary"
          />
          Sofort lieferbar
        </label>

        <label className="flex items-center gap-2 text-sm">
          <span className="sr-only">Sortieren nach</span>
          <select
            value={searchParams.get('sortierung') ?? 'beliebt'}
            onChange={(e) => updateParam('sortierung', e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
