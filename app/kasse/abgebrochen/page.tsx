// Purpose: Stripe checkout cancel page — cart persists, user can retry
// Docs: AGENTS.md

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Bestellung abgebrochen | ShopSIN',
  robots: { index: false },
}

export default function CancelPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 px-4 py-24 text-center">
      <div className="inline-flex size-16 items-center justify-center rounded-full bg-muted">
        <span className="text-2xl" aria-hidden>✕</span>
      </div>
      <h1 className="text-2xl font-bold text-foreground text-balance">
        Bestellung abgebrochen
      </h1>
      <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
        Kein Problem — dein Warenkorb ist noch da. Du kannst den Kauf jederzeit
        abschließen oder weiter stöbern.
      </p>
      <div className="flex gap-3">
        <Link
          href="/warenkorb"
          className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Zum Warenkorb
        </Link>
        <Link
          href="/produkte"
          className="rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
        >
          Weiter einkaufen
        </Link>
      </div>
    </main>
  )
}
