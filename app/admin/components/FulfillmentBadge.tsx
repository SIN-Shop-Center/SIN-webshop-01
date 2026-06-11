// Purpose: Fulfillment status badge (Step 8 of migration)
// Docs: PLAN-VERKAUFSFAEHIG.md (Step 8 — Admin Dashboard)

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  forwarded: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  shipped: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  delivered: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  failed: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Ausstehend',
  forwarded: 'An CJ übergeben',
  shipped: 'Versendet',
  delivered: 'Zugestellt',
  failed: 'Fehlgeschlagen',
}

export function FulfillmentBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
        STATUS_STYLES[status] ?? STATUS_STYLES.pending
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}
