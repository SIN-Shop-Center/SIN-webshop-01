import type { LucideIcon } from 'lucide-react'

function statusTone(value: string | null) {
  if (['published', 'approved', 'ready_to_publish', 'low', 'connected'].includes(value || '')) {
    return 'border-success/20 bg-success/5 text-success'
  }
  if (['failed', 'blocked', 'rejected', 'high'].includes(value || '')) {
    return 'border-destructive/20 bg-destructive/5 text-destructive'
  }
  return 'border-border bg-muted/40 text-muted-foreground'
}

export function StatusPill({ value }: { value: string | null }) {
  return <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${statusTone(value)}`}>{value || '—'}</span>
}

export function ProductMetric({ label, value, detail, icon: Icon, danger = false }: {
  label: string
  value: number | string
  detail: string
  icon: LucideIcon
  danger?: boolean
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between"><p className="text-xs font-medium text-muted-foreground">{label}</p><Icon className={`size-4 ${danger ? 'text-destructive' : 'text-muted-foreground'}`} aria-hidden /></div>
      <p className={`mt-5 text-3xl font-semibold tabular-nums ${danger ? 'text-destructive' : ''}`}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}
