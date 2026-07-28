'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

const OPTIONS = [
  { value: 'neueste', label: 'Neueste zuerst' },
  { value: 'preis-auf', label: 'Preis aufsteigend' },
  { value: 'preis-ab', label: 'Preis absteigend' },
  { value: 'name', label: 'Name A-Z' },
] as const

export function SortSelect() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = searchParams.get('sortierung') ?? 'neueste'

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('sortierung', value)
    params.delete('seite')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Sortieren:</span>
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
