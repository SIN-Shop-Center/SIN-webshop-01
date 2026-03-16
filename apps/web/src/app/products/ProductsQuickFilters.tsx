'use client'

type QuickFilterItem = {
  id: string
  label: string
  active: boolean
  onClick: () => void
}

type ProductsQuickFiltersProps = {
  items: QuickFilterItem[]
}

export function ProductsQuickFilters({ items }: ProductsQuickFiltersProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={item.onClick}
          className={[
            'ui-pill text-sm font-semibold',
            item.active ? 'ui-pill-active' : 'ui-pill-muted',
          ].join(' ')}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
