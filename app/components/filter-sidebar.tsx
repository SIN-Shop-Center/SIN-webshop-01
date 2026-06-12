// Purpose: Filter sidebar for product listing — category and price range
// Docs: filter-sidebar.doc.md

'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { translateCategory } from '@/lib/category-labels'

interface FilterSidebarProps {
  categories: Array<{ id: string; name: string }>
  activeCategory?: string
}

export function FilterSidebar({ categories, activeCategory }: FilterSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const maxPrice = searchParams.get('preis_max')

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === null) params.delete(key)
    else params.set(key, value)
    params.delete('seite')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  // Deutsch übersetzt und alphabetisch sortiert
  const sortedCategories = [...categories].sort((a, b) =>
    translateCategory(a.name).localeCompare(translateCategory(b.name), 'de'),
  )

  return (
    <aside aria-label="Produktfilter" className="flex w-full flex-col gap-6 md:w-56 md:shrink-0">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Kategorie</h3>
        <ul className="flex flex-col gap-1">
          <li>
            <button
              onClick={() => setParam('kategorie', null)}
              className={`text-sm ${!activeCategory ? 'font-semibold text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Alle Kategorien
            </button>
          </li>
          {sortedCategories.map((cat) => (
            <li key={cat.id}>
              <button
                onClick={() => setParam('kategorie', cat.id)}
                className={`text-left text-sm ${activeCategory === cat.id ? 'font-semibold text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {translateCategory(cat.name)}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Preis</h3>
        <ul className="flex flex-col gap-1">
          {[
            { label: 'Alle Preise', value: null },
            { label: 'Bis 10 €', value: '10' },
            { label: 'Bis 25 €', value: '25' },
            { label: 'Bis 50 €', value: '50' },
            { label: 'Bis 100 €', value: '100' },
          ].map((opt) => (
            <li key={opt.label}>
              <button
                onClick={() => setParam('preis_max', opt.value)}
                className={`text-sm ${maxPrice === opt.value || (!maxPrice && opt.value === null) ? 'font-semibold text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
