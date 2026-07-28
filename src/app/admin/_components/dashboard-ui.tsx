import { CheckCircle2, type LucideIcon } from 'lucide-react'

export const STATUS_STYLES = {
  ready: 'border-success/20 bg-success/5 text-success',
  attention: 'border-accent/25 bg-accent/5 text-accent',
  blocked: 'border-destructive/25 bg-destructive/5 text-destructive',
  idle: 'border-border bg-muted/40 text-muted-foreground',
} as const

export function statusLabel(status: keyof typeof STATUS_STYLES) {
  if (status === 'ready') return 'Bereit'
  if (status === 'attention') return 'Aufgabe offen'
  if (status === 'blocked') return 'Blockiert'
  return 'Wartet'
}

export function JobStatus({ status }: { status: string }) {
  const className = status === 'completed'
    ? 'bg-success/10 text-success'
    : status === 'failed' || status === 'dead'
      ? 'bg-destructive/10 text-destructive'
      : status === 'processing'
        ? 'bg-primary/10 text-primary'
        : 'bg-muted text-muted-foreground'
  return <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${className}`}>{status}</span>
}

export function MetricCard({ label, value, detail, icon: Icon, danger = false }: {
  label: string
  value: string
  detail: string
  icon: LucideIcon
  danger?: boolean
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Icon className={`size-4 ${danger ? 'text-destructive' : 'text-muted-foreground'}`} aria-hidden />
      </div>
      <p className={`mt-5 text-3xl font-semibold tracking-tight tabular-nums ${danger ? 'text-destructive' : ''}`}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="grid min-h-40 place-items-center px-6 text-center">
      <div><CheckCircle2 className="mx-auto size-5 text-muted-foreground" aria-hidden />
        <p className="mt-2 text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  )
}
