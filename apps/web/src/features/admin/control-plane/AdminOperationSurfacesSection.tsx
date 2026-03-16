'use client'

import Link from '@/components/ui/Link'
import { LayoutList, ShieldCheck } from 'lucide-react'
import { ADMIN_OPERATION_SURFACES } from '@/features/admin/constants'

export function AdminOperationSurfacesSection() {
  return (
    <section className="mt-6 panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-eyebrow">Operative Datenflächen</p>
          <h2 className="mt-2 text-2xl">Schnellzugriff auf Tabellen und Policies</h2>
          <p className="mt-2 text-sm text-brand-text-muted">
            Diese Flächen bleiben erreichbar, aber bewusst als sekundäre Operativ-Views statt als Hauptnavigation.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-border bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-text-muted">
          <LayoutList className="h-3.5 w-3.5" />
          Data Surfaces
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {ADMIN_OPERATION_SURFACES.map((surface) => {
          const Icon = surface.icon || ShieldCheck
          return (
            <Link
              key={surface.href}
              href={surface.href}
              className="rounded-2xl border border-brand-border bg-white px-4 py-4 transition-colors hover:border-brand-border-strong"
            >
              <div className="flex items-start gap-3">
                <span className="rounded-2xl bg-brand-bg-muted p-3 text-brand-text">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold text-brand-text">{surface.title}</p>
                  <p className="mt-2 text-sm text-brand-text-muted">{surface.description}</p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

