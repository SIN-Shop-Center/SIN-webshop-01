// Purpose: Reusable order status badge with color-coded states
// Docs: AGENTS.md

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  pending: {
    label: 'Ausstehend',
    className: 'bg-accent/10 text-accent',
  },
  processing: {
    label: 'In Bearbeitung',
    className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  },
  forwarded: {
    label: 'In Bearbeitung',
    className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  },
  paid: {
    label: 'Bezahlt',
    className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  },
  shipped: {
    label: 'Versendet',
    className: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  },
  delivered: {
    label: 'Zugestellt',
    className: 'bg-success/10 text-success',
  },
  cancelled: {
    label: 'Storniert',
    className: 'bg-destructive/10 text-destructive',
  },
  failed: {
    label: 'Fehlgeschlagen',
    className: 'bg-destructive/10 text-destructive',
  },
}

const DEFAULT_CONFIG = {
  label: 'Unbekannt',
  className: 'bg-muted text-muted-foreground',
}

export function resolveOrderStatus(
  fulfillmentStatus: string | null,
  paymentStatus: string,
): string {
  if (fulfillmentStatus && fulfillmentStatus in STATUS_CONFIG) {
    return fulfillmentStatus
  }
  if (fulfillmentStatus === 'pending') return 'pending'
  if (paymentStatus in STATUS_CONFIG) return paymentStatus
  return fulfillmentStatus ?? paymentStatus
}

export function OrderStatusBadge({
  status,
}: {
  status: string
}) {
  const config = STATUS_CONFIG[status] ?? DEFAULT_CONFIG
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  )
}
