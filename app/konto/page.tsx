// Purpose: Account overview hub — links to orders, wishlist, password change, contact, logout
// Docs: AGENTS.md

import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PackageIcon, HeartIcon, LogOutIcon, KeyRoundIcon, MapPinIcon, MailIcon, UserIcon } from '@/components/icons'

export const metadata: Metadata = {
  title: 'Mein Konto',
  robots: { index: false },
}

export default async function KontoPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login?weiter=/konto')

  const tiles = [
    { href: '/konto/bestellungen', icon: PackageIcon, title: 'Meine Bestellungen', desc: 'Bestellstatus und Historie ansehen' },
    { href: '/wunschliste', icon: HeartIcon, title: 'Wunschliste', desc: 'Gemerkte Produkte ansehen' },
    { href: '/auth/passwort-aktualisieren', icon: KeyRoundIcon, title: 'Passwort ändern', desc: 'Neues Passwort festlegen' },
    { href: '/kontakt', icon: MailIcon, title: 'Hilfe & Kontakt', desc: 'Fragen zu deiner Bestellung?' },
  ]

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 md:py-12">
      <div className="mb-8 flex items-center gap-4">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <UserIcon aria-hidden className="size-6 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mein Konto</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <nav aria-label="Konto-Bereiche" className="grid gap-4 sm:grid-cols-2">
        {tiles.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="flex items-center gap-4 rounded-lg border border-border bg-card p-5 transition-colors hover:bg-muted"
          >
            <tile.icon aria-hidden className="size-6 text-primary shrink-0" />
            <div>
              <p className="font-semibold text-card-foreground">{tile.title}</p>
              <p className="text-sm text-muted-foreground">{tile.desc}</p>
            </div>
          </Link>
        ))}
      </nav>

      <form action="/auth/logout" method="post" className="mt-8">
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <LogOutIcon aria-hidden className="size-4" />
          Abmelden
        </button>
      </form>
    </div>
  )
}
