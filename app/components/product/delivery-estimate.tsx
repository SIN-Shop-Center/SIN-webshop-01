import { Truck, Clock } from 'lucide-react'

function formatDate(daysFromNow: number) {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })
}

export function DeliveryEstimate({
  minDays = 7,
  maxDays = 15,
}: {
  minDays?: number
  maxDays?: number
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted p-3 text-sm">
      <p className="flex items-center gap-2">
        <Truck className="size-4 shrink-0 text-success" aria-hidden />
        <span>
          Lieferung voraussichtlich{' '}
          <strong>
            {formatDate(minDays)} &ndash; {formatDate(maxDays)}
          </strong>
        </span>
      </p>
      <p className="flex items-center gap-2 text-muted-foreground">
        <Clock className="size-4 shrink-0" aria-hidden />
        <span>
          Versand aus internationalem Lager ({minDays}&ndash;{maxDays} Werktage)
        </span>
      </p>
    </div>
  )
}
