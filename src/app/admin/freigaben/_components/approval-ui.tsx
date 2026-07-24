import { BadgeCheck, type LucideIcon } from 'lucide-react'

export function Field({
  name,
  label,
  defaultValue,
  required = false,
  type = 'text',
}: {
  name: string
  label: string
  defaultValue: string | null
  required?: boolean
  type?: string
}) {
  return (
    <label className="block text-xs font-medium">
      <span>{label}</span>
      <input
        className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-foreground"
        name={name}
        defaultValue={defaultValue || ''}
        required={required}
        type={type}
      />
    </label>
  )
}

export function QueueMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number
  icon: LucideIcon
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Icon className="size-4 text-muted-foreground" aria-hidden />
      </div>
      <p className="mt-5 text-3xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}

export function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3 border-b border-border px-5 py-5 sm:px-6">
      <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-muted/40">
        <Icon className="size-4" aria-hidden />
      </div>
      <div>
        <h2 className="font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

export function StatusPill({ value }: { value: string }) {
  return (
    <span className="rounded-full border border-border bg-muted/40 px-2 py-1 text-[10px] font-semibold">
      {value}
    </span>
  )
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="grid min-h-36 place-items-center px-6 text-center">
      <div>
        <BadgeCheck className="mx-auto size-5 text-muted-foreground" aria-hidden />
        <p className="mt-2 text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  )
}
