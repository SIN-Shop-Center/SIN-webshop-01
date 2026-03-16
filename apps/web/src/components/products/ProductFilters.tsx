'use client'

import type { Category } from '@/types'
import { ProductFiltersPanel } from './ProductFiltersPanel'

export interface FilterState {
  categories: string[]
  priceRange: [number, number]
  inStock: boolean | null
  featuredBadges: string[]
  useCases: string[]
  ratingMin: number | null
  fastDeliveryOnly: boolean
  sortBy: string
  search: string
}

interface ProductFiltersProps {
  categories: Category[]
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  minPrice?: number
  maxPrice?: number
  productCount?: number
  availableUseCases?: string[]
}

export const defaultFilterState: FilterState = {
  categories: [],
  priceRange: [0, 1000],
  inStock: null,
  featuredBadges: [],
  useCases: [],
  ratingMin: null,
  fastDeliveryOnly: false,
  sortBy: 'popular',
  search: '',
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min
  }
  if (value > max) {
    return max
  }
  return value
}

export function ProductFilters({
  categories,
  filters,
  onFiltersChange,
  minPrice = 0,
  maxPrice = 1000,
  productCount = 0,
  availableUseCases = [],
}: ProductFiltersProps) {
  const setValue = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const setMinPrice = (rawInput: string) => {
    if (rawInput.trim() === '') {
      return
    }
    const parsed = Number(rawInput)
    const fallback = filters.priceRange[0]
    const safeValue = Number.isFinite(parsed) ? parsed : fallback
    const clamped = clamp(safeValue, minPrice, filters.priceRange[1])
    setValue('priceRange', [clamped, filters.priceRange[1]])
  }

  const setMaxPrice = (rawInput: string) => {
    if (rawInput.trim() === '') {
      return
    }
    const parsed = Number(rawInput)
    const fallback = filters.priceRange[1]
    const safeValue = Number.isFinite(parsed) ? parsed : fallback
    const clamped = clamp(safeValue, filters.priceRange[0], maxPrice)
    setValue('priceRange', [filters.priceRange[0], clamped])
  }

  const toggleCategory = (categoryId: string) => {
    if (filters.categories.includes(categoryId)) {
      setValue(
        'categories',
        filters.categories.filter((value) => value !== categoryId),
      )
      return
    }
    setValue('categories', [...filters.categories, categoryId])
  }

  const toggleBadge = (badgeId: string) => {
    if (filters.featuredBadges.includes(badgeId)) {
      setValue(
        'featuredBadges',
        filters.featuredBadges.filter((value) => value !== badgeId),
      )
      return
    }
    setValue('featuredBadges', [...filters.featuredBadges, badgeId])
  }

  const toggleUseCase = (useCase: string) => {
    if (filters.useCases.includes(useCase)) {
      setValue(
        'useCases',
        filters.useCases.filter((value) => value !== useCase),
      )
      return
    }
    setValue('useCases', [...filters.useCases, useCase])
  }

  const clearFilters = () => {
    onFiltersChange({
      categories: [],
      priceRange: [minPrice, maxPrice],
      inStock: null,
      featuredBadges: [],
      useCases: [],
      ratingMin: null,
      fastDeliveryOnly: false,
      sortBy: 'popular',
      search: filters.search,
    })
  }

  const hasFilters =
    filters.categories.length > 0 ||
    filters.inStock !== null ||
    filters.featuredBadges.length > 0 ||
    filters.useCases.length > 0 ||
    filters.ratingMin !== null ||
    filters.fastDeliveryOnly ||
    filters.priceRange[0] !== minPrice ||
    filters.priceRange[1] !== maxPrice
  const activeFilterCount =
    filters.categories.length +
    (filters.inStock !== null ? 1 : 0) +
    filters.featuredBadges.length +
    filters.useCases.length +
    (filters.ratingMin !== null ? 1 : 0) +
    (filters.fastDeliveryOnly ? 1 : 0) +
    (filters.priceRange[0] !== minPrice || filters.priceRange[1] !== maxPrice ? 1 : 0)

  return <ProductFiltersPanel categories={categories} filters={filters} setValue={setValue} toggleCategory={toggleCategory} toggleBadge={toggleBadge} toggleUseCase={toggleUseCase} setMinPrice={setMinPrice} setMaxPrice={setMaxPrice} minPrice={minPrice} maxPrice={maxPrice} productCount={productCount} activeFilterCount={activeFilterCount} hasFilters={hasFilters} clearFilters={clearFilters} availableUseCases={availableUseCases} />
}
