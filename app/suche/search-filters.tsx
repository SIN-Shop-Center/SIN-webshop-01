'use client'

// Purpose: Search-Filter Sidebar mit URL-State (Issue #49 UI)
// Docs: Filter-Änderungen navigieren per router.push, kein Submit nötig.

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

const CATEGORIES = [
  'Elektronik',
  'Haushalt',
  'Mode',
  'Sport',
  'Spielzeug',
]

const SORTS = [
  { value: 'relevance', label: 'Relevanz' },
  { value: 'price-asc', label: 'Preis aufsteigend' },
  { value: 'price-desc', label: 'Preis absteigend' },
  { value: 'newest', label: 'Neueste' },
] as const

export function SearchFilters() {
  const router = useRouter()
  const params = useSearchParams()

  const update = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString())
      if (value) next.set(key, value)
      else next.delete(key)
      // Bei Filter-Wechsel zurück auf Seite 1
      next.delete('seite')
      router.push(`/suche?${next.toString()}`)
    },
    [params, router],
  )

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => e.preventDefault()}
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Kategorie</legend>
        {CATEGORIES.map((c) => (
          <label
            key={c}
            className="flex items-center gap-2 text-sm"
          >
            <input
              type="radio"
              name="kategorie"
              checked={params.get('kategorie') === c}
              onChange={() => update('kategorie', c)}
            />
            {c}
          </label>
        ))}
        {params.get('kategorie') && (
          <button
            type="button"
            onClick={() => update('kategorie', null)}
            className="text-left text-sm text-muted-foreground underline underline-offset-4"
          >
            Zurücksetzen
          </button>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Preis</legend>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="min-price">
            Mindestpreis
          </label>
          <input
            id="min-price"
            type="number"
            min={0}
            placeholder="Min"
            defaultValue={params.get('min') ?? ''}
            onBlur={(e) => update('min', e.target.value || null)}
            className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm"
          />
          <span aria-hidden="true">–</span>
          <label className="sr-only" htmlFor="max-price">
            Höchstpreis
          </label>
          <input
            id="max-price"
            type="number"
            min={0}
            placeholder="Max"
            defaultValue={params.get('max') ?? ''}
            onBlur={(e) => update('max', e.target.value || null)}
            className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm"
          />
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={params.get('verfuegbar') === '1'}
          onChange={(e) =>
            update('verfuegbar', e.target.checked ? '1' : null)
          }
        />
        Nur verfügbare Artikel
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Sortieren</span>
        <select
          value={params.get('sortierung') ?? 'relevance'}
          onChange={(e) => update('sortierung', e.target.value)}
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
    </form>
  )
}