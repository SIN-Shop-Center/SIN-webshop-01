'use client'

import {useRouter, useSearchParams, usePathname} from 'next/navigation'
import {useTranslations} from 'next-intl'
import {translateCategory} from '@/lib/category-labels'

interface FilterSidebarProps {
  categories: Array<{id: string; name: string}>
  activeCategory?: string
}

export function FilterSidebar({categories, activeCategory}: FilterSidebarProps) {
  const t = useTranslations('filter')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const maxPrice = searchParams.get('preis_max')

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === null) params.delete(key)
    else params.set(key, value)
    params.delete('seite')
    router.push(`${pathname}?${params.toString()}`, {scroll: false})
  }

  const sortedCategories = [...categories].sort((a, b) =>
    translateCategory(a.name).localeCompare(translateCategory(b.name), 'de'),
  )

  return (
    <aside aria-label={t('label')} className="flex w-full flex-col gap-6 md:w-56 md:shrink-0">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">{t('category')}</h3>
        <ul className="flex flex-col gap-1">
          <li>
            <button
              onClick={() => setParam('kategorie', null)}
              className={`text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${!activeCategory ? 'font-semibold text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {t('allCategories')}
            </button>
          </li>
          {sortedCategories.map((cat) => (
            <li key={cat.id}>
              <button
                onClick={() => setParam('kategorie', cat.id)}
                className={`text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${activeCategory === cat.id ? 'font-semibold text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {translateCategory(cat.name)}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">{t('price')}</h3>
        <ul className="flex flex-col gap-1">
          {[
            {label: t('allPrices'), value: null},
            {label: t('upTo10'), value: '10'},
            {label: t('upTo25'), value: '25'},
            {label: t('upTo50'), value: '50'},
            {label: t('upTo100'), value: '100'},
          ].map((opt) => (
            <li key={opt.label}>
              <button
                onClick={() => setParam('preis_max', opt.value)}
                className={`text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${maxPrice === opt.value || (!maxPrice && opt.value === null) ? 'font-semibold text-primary' : 'text-muted-foreground hover:text-foreground'}`}
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
