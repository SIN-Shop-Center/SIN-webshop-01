// Purpose: Fulfillment status badge (Step 8 + Step 10)
// Docs: PLAN-VERKAUFSFAEHIG.md

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-secondary text-secondary-foreground',
  forwarded: 'bg-primary/10 text-primary',
  shipped: 'bg-success/10 text-success',
  delivered: 'bg-success/10 text-success',
  failed: 'bg-destructive/10 text-destructive',
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
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        STATUS_STYLES[status] ?? STATUS_STYLES.pending
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}
