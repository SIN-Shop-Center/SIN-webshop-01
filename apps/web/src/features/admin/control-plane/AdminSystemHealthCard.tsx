'use client'

import { Activity } from 'lucide-react'
import type { HealthStatus } from '@/features/admin/types'

export function AdminSystemHealthCard({ health }: { health: HealthStatus[] }) {
  return (
    <article className="panel p-5">
      <h2 className="flex items-center gap-2 text-xl">
        <Activity className="h-5 w-5 text-brand-accent" />
        Systemzustand
      </h2>
      <div className="mt-4 space-y-3">
        {health.map((entry) => (
          <div key={entry.label} className="rounded-2xl border border-brand-border bg-white px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-brand-text">{entry.label}</p>
              <span className={entry.ok ? 'text-sm font-semibold text-emerald-700' : 'text-sm font-semibold text-red-700'}>
                {entry.ok ? 'Gesund' : 'Prüfen'}
              </span>
            </div>
            <p className="mt-2 text-sm text-brand-text-muted">{entry.detail}</p>
          </div>
        ))}
      </div>
    </article>
  )
}

