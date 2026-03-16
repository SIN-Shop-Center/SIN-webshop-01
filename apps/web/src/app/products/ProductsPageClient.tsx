'use client'

import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ProductGrid } from '@/components/products/ProductGrid'
import { JsonLd } from '@/components/seo/JsonLd'
import { ProductFilters, defaultFilterState, type FilterState } from '@/components/products/ProductFilters'
import { enrichProducts, loadCatalogCategories, loadCatalogProducts, matchesBadge, matchesUseCase } from '@/features/catalog'
import { useCustomerSegmentStore } from '@/features/segment'
import { buildProductListJsonLd } from '@/lib/seo'
import type { Category, Product } from '@/types'
import { ProductsPageHeader } from './ProductsPageHeader'
import { ProductsQuickFilters } from './ProductsQuickFilters'
import { ProductsResultsSummary } from './ProductsResultsSummary'
import { sortProducts } from './sortProducts'

type ProductsPageClientProps = {
  initialProducts: Product[]
  initialCategories: Category[]
}

export function ProductsPageClient({ initialProducts, initialCategories }: ProductsPageClientProps) {
  const segment = useCustomerSegmentStore((state) => state.segment)
  const setSegment = useCustomerSegmentStore((state) => state.setSegment)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchParamsValue = searchParams.toString()

  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [filters, setFilters] = useState<FilterState>(defaultFilterState)
  const [loading, setLoading] = useState(initialProducts.length === 0 && initialCategories.length === 0)
  const deferredSearch = useDeferredValue(filters.search)
  const enrichedProducts = useMemo(() => enrichProducts(products), [products])
  const availableUseCases = useMemo(
    () => Array.from(new Set(enrichedProducts.flatMap((product) => product.useCases || []))),
    [enrichedProducts],
  )

  useEffect(() => {
    const routeSegment = searchParams.get('segment')
    if ((routeSegment === 'b2b' || routeSegment === 'b2c') && routeSegment !== segment) {
      setSegment(routeSegment)
    }
  }, [searchParamsValue, searchParams, segment, setSegment])

  useEffect(() => {
    let active = true

    const run = async () => {
      setLoading(true)
      try {
        const [loadedProducts, loadedCategories] = await Promise.all([loadCatalogProducts({ limit: 120 }), loadCatalogCategories()])

        if (!active) {
          return
        }

        const nextProducts = enrichProducts(loadedProducts)
        const maxPrice = Math.max(...nextProducts.map((product) => product.price), 100)
        setProducts(nextProducts)
        setCategories(loadedCategories)
        setFilters((current) => ({ ...current, priceRange: [0, Math.ceil(maxPrice)] }))
      } catch {
        if (!active) {
          return
        }
        setProducts([])
        setCategories([])
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void run()

    return () => {
      active = false
    }
  }, [initialCategories, initialProducts])

  const maxCatalogPrice = useMemo(() => Math.ceil(Math.max(...enrichedProducts.map((product) => product.price), 100)), [enrichedProducts])
  const catalogPriceCeiling = products.length > 0 ? maxCatalogPrice : filters.priceRange[1]

  useEffect(() => {
    const nextFilters: FilterState = {
      ...defaultFilterState,
      priceRange: [0, catalogPriceCeiling],
      sortBy: searchParams.get('sort') || 'popular',
      search: searchParams.get('search') || searchParams.get('q') || '',
    }

    const routeBadge = searchParams.get('badge')
    if (routeBadge) {
      nextFilters.featuredBadges = [routeBadge]
    }

    const routeUseCase = searchParams.get('useCase')
    if (routeUseCase) {
      nextFilters.useCases = [routeUseCase]
    }

    const routeDelivery = searchParams.get('delivery')
    if (routeDelivery === 'fast') {
      nextFilters.fastDeliveryOnly = true
    }

    const routeRating = searchParams.get('rating')
    if (routeRating) {
      const parsedRating = Number(routeRating)
      if (Number.isFinite(parsedRating)) {
        nextFilters.ratingMin = parsedRating
      }
    }

    const pricePreset = searchParams.get('pricePreset')
    if (pricePreset) {
      const parsedPreset = Number(pricePreset)
      if (Number.isFinite(parsedPreset)) {
        nextFilters.priceRange = [0, Math.min(parsedPreset, catalogPriceCeiling)]
      }
    }

    setFilters((current) => {
      if (JSON.stringify(current) === JSON.stringify(nextFilters)) {
        return current
      }
      return nextFilters
    })
  }, [catalogPriceCeiling, searchParams, searchParamsValue])
  const hasPriceFilter = filters.priceRange[0] !== 0 || filters.priceRange[1] !== catalogPriceCeiling
  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.inStock !== null ||
    filters.featuredBadges.length > 0 ||
    filters.useCases.length > 0 ||
    filters.ratingMin !== null ||
    filters.fastDeliveryOnly ||
    hasPriceFilter
  const activeFilterCount =
    filters.categories.length +
    (filters.inStock !== null ? 1 : 0) +
    filters.featuredBadges.length +
    filters.useCases.length +
    (filters.ratingMin !== null ? 1 : 0) +
    (filters.fastDeliveryOnly ? 1 : 0) +
    (hasPriceFilter ? 1 : 0)

  const filteredProducts = useMemo(() => {
    const search = deferredSearch.trim().toLowerCase()

    const bySearch = enrichedProducts.filter((product) => {
      if (!search) {
        return true
      }
      return (
        product.name.toLowerCase().includes(search) ||
        product.description.toLowerCase().includes(search) ||
        (product.useCases || []).some((entry) => entry.toLowerCase().includes(search))
      )
    })

    const byCategory = bySearch.filter((product) => {
      if (filters.categories.length === 0) {
        return true
      }
      return filters.categories.includes(product.categoryId)
    })

    const byPrice = byCategory.filter(
      (product) => product.price >= filters.priceRange[0] && product.price <= filters.priceRange[1],
    )

    const byStock = byPrice.filter((product) => {
      if (filters.inStock === null) {
        return true
      }
      const isInStock = product.inStock ?? product.stock > 0
      return isInStock === filters.inStock
    })

    const byBadge = byStock.filter((product) => {
      if (filters.featuredBadges.length === 0) {
        return true
      }
      return filters.featuredBadges.every((badgeId) => matchesBadge(product, badgeId))
    })

    const byUseCase = byBadge.filter((product) => {
      if (filters.useCases.length === 0) {
        return true
      }
      return filters.useCases.some((useCase) => matchesUseCase(product, useCase))
    })

    const byRating = byUseCase.filter((product) => {
      if (filters.ratingMin === null) {
        return true
      }
      return (product.rating ?? 0) >= filters.ratingMin
    })

    const byDelivery = byRating.filter((product) => {
      if (!filters.fastDeliveryOnly) {
        return true
      }
      return (product.deliveryEstimate || '').toLowerCase().includes('24-48h')
    })

    return sortProducts(byDelivery, filters.sortBy)
  }, [deferredSearch, enrichedProducts, filters.categories, filters.featuredBadges, filters.fastDeliveryOnly, filters.inStock, filters.priceRange, filters.ratingMin, filters.sortBy, filters.useCases])

  const productListJsonLd = useMemo(() => buildProductListJsonLd(filteredProducts, 'Produktkatalog', '/products'), [filteredProducts])

  const switchSegment = (next: 'b2c' | 'b2b') => {
    if (next !== segment) {
      setSegment(next)
    }

    const params = new URLSearchParams(searchParamsValue)
    params.set('segment', next)
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  const resetCatalogFilters = () => {
    setFilters({
      categories: [],
      priceRange: [0, catalogPriceCeiling],
      inStock: null,
      sortBy: 'popular',
      search: '',
      featuredBadges: [],
      useCases: [],
      ratingMin: null,
      fastDeliveryOnly: false,
    })
  }

  const sortLabels: Record<string, string> = {
    popular: 'Beliebtheit',
    'top-rated': 'Bestbewertet',
    'fast-shipping': 'Schnell lieferbar',
    newest: 'Neueste zuerst',
    'price-asc': 'Preis aufsteigend',
    'price-desc': 'Preis absteigend',
    'name-asc': 'Name A-Z',
    'name-desc': 'Name Z-A',
  }

  const quickFilters = useMemo(() => {
    const preferredUseCases =
      segment === 'b2b'
        ? ['Home Office', 'Pendeln', 'Routine Start']
        : ['Routine Start', 'Geschenke', 'Home Office']

    const items = [
      {
        id: 'badge:bestseller',
        label: 'Bestseller',
        active: filters.featuredBadges.includes('bestseller'),
        onClick: () =>
          setFilters((current) => ({
            ...current,
            featuredBadges: current.featuredBadges.includes('bestseller')
              ? current.featuredBadges.filter((entry) => entry !== 'bestseller')
              : [...current.featuredBadges, 'bestseller'],
          })),
      },
      {
        id: 'badge:new',
        label: 'Neu',
        active: filters.featuredBadges.includes('new'),
        onClick: () =>
          setFilters((current) => ({
            ...current,
            featuredBadges: current.featuredBadges.includes('new')
              ? current.featuredBadges.filter((entry) => entry !== 'new')
              : [...current.featuredBadges, 'new'],
          })),
      },
      {
        id: 'badge:sale',
        label: 'Angebote',
        active: filters.featuredBadges.includes('sale'),
        onClick: () =>
          setFilters((current) => ({
            ...current,
            featuredBadges: current.featuredBadges.includes('sale')
              ? current.featuredBadges.filter((entry) => entry !== 'sale')
              : [...current.featuredBadges, 'sale'],
          })),
      },
      {
        id: 'delivery:fast',
        label: 'Schnell lieferbar',
        active: filters.fastDeliveryOnly,
        onClick: () => setFilters((current) => ({ ...current, fastDeliveryOnly: !current.fastDeliveryOnly })),
      },
    ]

    preferredUseCases.forEach((useCase) => {
      if (!availableUseCases.includes(useCase)) {
        return
      }

      items.push({
        id: `useCase:${useCase}`,
        label: useCase,
        active: filters.useCases.includes(useCase),
        onClick: () =>
          setFilters((current) => ({
            ...current,
            useCases: current.useCases.includes(useCase)
              ? current.useCases.filter((entry) => entry !== useCase)
              : [...current.useCases, useCase],
          })),
      })
    })

    return items
  }, [availableUseCases, filters.fastDeliveryOnly, filters.featuredBadges, filters.useCases, segment])

  return (
    <main className="shell-container py-10">
      <JsonLd id="products-item-list" data={productListJsonLd} />

      <ProductsPageHeader
        segment={segment}
        search={filters.search}
        onSearchChange={(search) => setFilters((current) => ({ ...current, search }))}
        onSwitchSegment={switchSegment}
      />

      <div className="grid gap-6 lg:grid-cols-[18.5rem_minmax(0,1fr)] xl:grid-cols-[19rem_minmax(0,1fr)]">
        <ProductFilters
          categories={categories}
          filters={filters}
          onFiltersChange={setFilters}
          minPrice={0}
          maxPrice={catalogPriceCeiling}
          productCount={filteredProducts.length}
          availableUseCases={availableUseCases}
        />

        <section className="min-w-0">
          <ProductsQuickFilters items={quickFilters} />
          <ProductsResultsSummary
            count={filteredProducts.length}
            loading={loading}
            segment={segment}
            search={filters.search}
            activeFilterCount={activeFilterCount}
            sortLabel={sortLabels[filters.sortBy] || 'Neueste zuerst'}
            onReset={resetCatalogFilters}
          />
          <ProductGrid
            products={filteredProducts}
            loading={loading}
            columns={3}
            emptyMessage="Keine passenden Produkte gefunden."
            emptyHint={
              filters.search.trim()
                ? 'Prüfe die Schreibweise oder zeige wieder das ganze Sortiment an.'
                : hasActiveFilters
                  ? 'Entferne Filter oder wechsle den Einkaufsmodus, um mehr Produkte zu sehen.'
                  : 'Wechsle den Einkaufsmodus oder starte direkt wieder im gesamten Sortiment.'
            }
            emptyActionLabel="Alles anzeigen"
            onEmptyAction={resetCatalogFilters}
          />
        </section>
      </div>
    </main>
  )
}
