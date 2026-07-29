import { CheckCircle2, CircleAlert } from 'lucide-react'

export function StockIndicator({ stock }: { stock: number }) {
  if (stock <= 0) {
    return (
      <div className="flex items-center gap-2 text-sm font-medium text-destructive" role="status">
        <CircleAlert className="size-4" aria-hidden />
        Zurzeit nicht verfügbar
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-sm" role="status">
      <CheckCircle2 className="size-4 text-success" aria-hidden />
      <span>
        Verfügbar: <strong>{stock}</strong> {stock === 1 ? 'Stück' : 'Stück'}
      </span>
    </div>
  )
}
