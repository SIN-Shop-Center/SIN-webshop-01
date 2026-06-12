// Purpose: Search bar with live autocomplete results
// Docs: AGENTS.md

'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import useSWR from 'swr'
import { Search, Loader2 } from 'lucide-react'

type SearchResult = { id: string; title: string; price: number | string; image_url: string }

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function formatEur(value: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value)
}

export function SearchAutocomplete() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [debounced, setDebounced] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 250)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const { data, isLoading } = useSWR<{ results: SearchResult[] }>(
    debounced.length >= 2 ? `/api/search?q=${encodeURIComponent(debounced)}&limit=5` : null,
    fetcher,
  )

  const results = data?.results ?? []

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          if (query.trim()) {
            setOpen(false)
            router.push(`/suche?q=${encodeURIComponent(query.trim())}`)
          }
        }}
        className="relative"
      >
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Wonach suchst du?"
          aria-label="Produkte durchsuchen"
          className="w-full rounded-full border border-border bg-muted/50 py-2 pl-9 pr-4 text-sm focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </form>

      {open && debounced.length >= 2 && (
        <div className="absolute top-full z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-background shadow-lg">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Suche läuft…
            </div>
          ) : results.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Keine Treffer für &quot;{debounced}&quot;</p>
          ) : (
            <ul>
              {results.map((result) => (
                <li key={result.id}>
                  <Link
                    href={`/produkt/${result.id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 p-2.5 hover:bg-muted"
                  >
                    <div className="relative size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                      <Image src={result.image_url || '/placeholder.svg'} alt="" fill sizes="40px" className="object-cover" />
                    </div>
                    <span className="line-clamp-1 flex-1 text-sm">{result.title}</span>
                    <span className="shrink-0 text-sm font-bold text-primary">
                      {formatEur(typeof result.price === 'string' ? Number(result.price) : result.price)}
                    </span>
                  </Link>
                </li>
              ))}
              <li className="border-t border-border">
                <Link
                  href={`/suche?q=${encodeURIComponent(debounced)}`}
                  onClick={() => setOpen(false)}
                  className="block p-2.5 text-center text-sm font-medium text-primary hover:bg-muted"
                >
                  Alle Ergebnisse anzeigen
                </Link>
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
