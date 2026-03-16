'use client'

import Link from '@/components/ui/Link'
import { ArrowRight, Radar } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { AdminDomainLink } from '@/features/admin/types'

export function AdminWorkspacesSection({ workspaces }: { workspaces: AdminDomainLink[] }) {
  return (
    <section className="mt-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-eyebrow">Kernbereiche</p>
          <h2 className="mt-2 text-2xl">Hier beginnt die tägliche Arbeit.</h2>
          <p className="mt-2 text-sm text-brand-text-muted">
            Kuratierte Flächen mit eigener Aufgabe, statt einer einzigen riesigen Sammelseite.
          </p>
        </div>
        <Link href="/admin/analytics">
          <Button rightIcon={<ArrowRight className="h-4 w-4" />}>Analytics öffnen</Button>
        </Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {workspaces.map((workspace) => {
          const Icon = workspace.icon || Radar
          return (
            <article key={workspace.href} className="panel p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="rounded-2xl bg-brand-bg-muted p-3 text-brand-text">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-text-muted">
                      {workspace.shortLabel || 'Workspace'}
                    </p>
                    <h3 className="mt-1 text-2xl">{workspace.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-brand-text-muted">{workspace.description}</p>
                  </div>
                </div>
                <Link href={workspace.href} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-accent hover:underline">
                  Öffnen
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

