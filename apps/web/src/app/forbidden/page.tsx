import type { Metadata } from 'next'
import Link from '@/components/ui/Link'
import { ShieldAlert } from 'lucide-react'
import { buildPageMetadata } from '@/lib/page-metadata'

export const metadata: Metadata = buildPageMetadata({
  title: 'Zugriff verweigert',
  description: 'Diese Seite ist nur für freigegebene Rollen und Konten erreichbar.',
  path: '/forbidden',
  noIndex: true,
})

export default function ForbiddenPage() {
  return (
    <main className="shell-container py-16">
      <section className="mx-auto max-w-2xl rounded-3xl border border-brand-border bg-white p-8 text-center shadow-sm">
        <ShieldAlert className="mx-auto h-8 w-8 text-brand-accent" />
        <h1 className="mt-4 text-4xl">Zugriff verweigert</h1>
        <p className="mt-3 text-brand-text-muted">
          Für diese Seite fehlen die erforderlichen Rollenrechte.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/kundencenter" className="rounded-xl border border-brand-border px-4 py-2 text-sm font-semibold hover:border-brand-accent hover:text-brand-accent">
            Zum Kundencenter
          </Link>
          <Link href="/admin" className="rounded-xl bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:bg-[color:var(--brand-accent-strong)]">
            Admin erneut prüfen
          </Link>
          <Link href="/admin/login" className="rounded-xl border border-brand-border px-4 py-2 text-sm font-semibold hover:border-brand-accent hover:text-brand-accent">
            Mit anderem Konto anmelden
          </Link>
        </div>
      </section>
    </main>
  )
}
