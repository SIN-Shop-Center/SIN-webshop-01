// Purpose: Stock scarcity indicator with progress bar
// Docs: AGENTS.md

export function StockIndicator({ stock }: { stock: number }) {
  if (stock <= 0 || stock > 10) return null

  const percent = Math.max(8, Math.min(100, stock * 10))

  return (
    <div className="flex flex-col gap-1" role="status">
      <p className="text-sm font-semibold text-sale">
        {stock <= 3 ? `Fast ausverkauft — nur noch ${stock} Stück!` : `Nur noch ${stock} auf Lager`}
      </p>
      <div className="h-1.5 w-full max-w-48 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className="h-full rounded-full bg-sale transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
