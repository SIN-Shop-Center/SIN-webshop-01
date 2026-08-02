import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import type { PipelineStageSnapshot } from '@/lib/actions/operations/types'
import { STATUS_STYLES, statusLabel } from './dashboard-ui'

export function PipelineStageGrid({ stages }: { stages: PipelineStageSnapshot[] }) {
  return (
    <section className="rounded-2xl border border-border bg-card">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div><h2 className="text-lg font-semibold tracking-tight">Produkt-Pipeline</h2>
          <p className="mt-1 text-sm text-muted-foreground">Jeder Schritt zeigt reale Daten oder einen klaren Konfigurationsfehler.</p>
        </div>
        <Link href="/admin/automatisierungen" className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline">
          Alle Automatisierungen <ArrowUpRight className="size-4" aria-hidden />
        </Link>
      </div>
      <div className="grid divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-7">
        {stages.map((stage, index) => (
          <Link key={stage.id} href={stage.href} className="group relative min-h-48 p-5 transition-colors hover:bg-muted/40">
            <div className="mb-6 flex items-start justify-between gap-3">
              <span className="text-xs font-medium tabular-nums text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
              <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${STATUS_STYLES[stage.status]}`}>
                {statusLabel(stage.status)}
              </span>
            </div>
            <p className="text-sm font-semibold tracking-tight">{stage.name}</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{stage.description}</p>
            <div className="mt-5 flex items-end justify-between">
              <span className="text-2xl font-semibold tabular-nums">{stage.count}</span>
              <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
