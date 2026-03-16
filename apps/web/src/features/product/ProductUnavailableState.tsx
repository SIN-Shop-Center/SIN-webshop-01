'use client'

import Link from '@/components/ui/Link'
import { Button } from '@/components/ui/Button'

type ProductUnavailableStateProps = {
  error?: boolean
}

export function ProductUnavailableState({ error = false }: ProductUnavailableStateProps) {
  const message = error
    ? 'Produktdaten konnten gerade nicht geladen werden. Bitte versuche es erneut oder gehe direkt ins Sortiment.'
    : 'Dieses Produkt ist aktuell nicht im Sortiment. Im Katalog findest du weiter klare Preise, Lieferung und Rückgabe.'

  return (
    <div className="rounded-[1.8rem] border border-brand-border bg-white/90 px-6 py-12 text-center shadow-[0_16px_40px_rgba(18,18,18,0.06)]">
      <p className="section-eyebrow">Produktseite</p>
      <h1 className="mt-2 text-3xl md:text-4xl">Produkt aktuell nicht verfügbar</h1>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-brand-text-muted">{message}</p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link href="/products" className="cta-primary inline-flex px-5 py-3 text-sm font-semibold">
          Zum Sortiment
        </Link>
        {error ? (
          <Button variant="outline" size="md" onClick={() => window.location.reload()}>
            Erneut laden
          </Button>
        ) : (
          <Link href="/" className="cta-secondary inline-flex px-5 py-3 text-sm font-semibold">
            Zur Startseite
          </Link>
        )}
      </div>

      <p className="mt-4 text-xs font-medium uppercase tracking-[0.12em] text-brand-text-muted">
        Rückfragen?{' '}
        <Link href="/kontakt" className="text-brand-text underline decoration-brand-border underline-offset-4 hover:text-black">
          Kontakt
        </Link>
      </p>
    </div>
  )
}
