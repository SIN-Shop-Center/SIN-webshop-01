'use client'

import Link from '@/components/ui/Link'
import { ArrowRight } from 'lucide-react'

type QuickEntry = {
  label: string
  description: string
  href: string
}

type HomeQuickEntryStripProps = {
  entries: QuickEntry[]
}

export function HomeQuickEntryStrip({ entries }: HomeQuickEntryStripProps) {
  if (entries.length === 0) {
    return null
  }

  return (
    <section className="shell-container mt-7">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {entries.map((entry) => (
          <Link
            key={entry.label}
            href={entry.href}
            className="group rounded-[1.4rem] border border-brand-border bg-white px-4 py-4 shadow-[0_10px_24px_rgba(18,18,18,0.04)] transition-all duration-200 hover:-translate-y-1 hover:border-black/15 hover:shadow-[0_18px_36px_rgba(18,18,18,0.08)]"
          >
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-brand-success">{entry.label}</p>
            <p className="mt-2 text-base font-semibold text-brand-text">{entry.description}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-text-muted transition-colors group-hover:text-brand-text">
              Einstieg öffnen
              <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
