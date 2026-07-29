import Link from 'next/link'
import { ArrowRight, Search, ShieldCheck } from 'lucide-react'

export function HomeHero() {
  return (
    <section className="border-b border-border bg-background">
      <div className="container mx-auto px-4 py-16 sm:py-20 lg:py-28">
        <div className="grid items-end gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="max-w-4xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="size-3.5" aria-hidden />
              Produktdaten, Bestand und Freigaben geprüft
            </div>
            <h1 className="max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.055em] text-balance sm:text-6xl lg:text-7xl">
              Produkte, die ihren Platz im Alltag verdienen.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Ein übersichtlicher Shop mit nachvollziehbaren Produktinformationen, realem Bestand,
              transparenter Lieferung und sicherer Zahlung.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/produkte" className="btn btn-primary btn-lg">
                Sortiment ansehen
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link href="/hilfe/versand" className="btn btn-outline btn-lg">
                Versand verstehen
              </Link>
            </div>
          </div>

          <form
            action="/search"
            method="GET"
            role="search"
            className="rounded-2xl border border-border bg-muted/20 p-5 sm:p-6"
          >
            <p className="text-sm font-semibold tracking-tight">Direkt zum passenden Produkt</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Suche nach Produkt, Kategorie oder Anwendungsfall.
            </p>
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-border bg-background p-2 focus-within:border-foreground">
              <Search className="ml-2 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <input
                type="search"
                name="q"
                required
                placeholder="Zum Beispiel Organizer oder Lampe"
                aria-label="Produkte suchen"
                className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm outline-none placeholder:text-muted-foreground"
              />
              <button type="submit" className="btn btn-primary btn-md shrink-0">
                Suchen
              </button>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-5 text-xs">
              <div>
                <p className="font-semibold">Echte Daten</p>
                <p className="mt-1 leading-5 text-muted-foreground">Keine erfundenen Produktversprechen.</p>
              </div>
              <div>
                <p className="font-semibold">Sicher bezahlen</p>
                <p className="mt-1 leading-5 text-muted-foreground">Checkout über Stripe.</p>
              </div>
              <div>
                <p className="font-semibold">Klare Hilfe</p>
                <p className="mt-1 leading-5 text-muted-foreground">Versand und Rückgabe erklärt.</p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}
