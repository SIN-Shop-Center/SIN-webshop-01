// Purpose: Redesigned homepage hero with lifestyle gradient, focused CTA and prominent search
// Docs: PLAN-VERKAUFSFAEHIG.md

import Link from 'next/link'
import { Search, ArrowRight, Sparkles } from 'lucide-react'

export async function HomeHero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* Decorative background gradients */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-background to-accent/[0.06]"
        aria-hidden="true"
      />
      <div
        className="absolute -right-32 -top-32 size-[520px] rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-40 -left-40 size-[480px] rounded-full bg-accent/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="container relative mx-auto px-4 py-16 md:py-24 lg:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full bg-sale/10 px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-sale">
            <Sparkles className="size-4" aria-hidden="true" />
            Bis zu 51 % sparen
          </span>

          <h1 className="mb-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-balance md:text-6xl lg:text-7xl">
            Premium Produkte,
            <br className="hidden md:block" />
            <span className="text-primary"> faire Preise</span>
          </h1>

          <p className="mb-8 text-lg leading-relaxed text-muted-foreground text-pretty md:text-xl">
            Handverlesene Produkte aus Mode, Wohnen, Elektronik und Lifestyle — mit
            kostenlosem Versand ab 49 € und 14 Tagen Widerrufsrecht.
          </p>

          <form
            action="/suche"
            method="GET"
            role="search"
            className="mx-auto mb-8 flex w-full max-w-xl items-center gap-2 rounded-2xl border border-border bg-background p-2 shadow-lg shadow-primary/5 transition-shadow focus-within:shadow-primary/10 focus-within:ring-2 focus-within:ring-ring"
          >
            <Search className="ml-3 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              name="q"
              required
              placeholder="Wonach suchst du?"
              aria-label="Produkte suchen"
              className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              className="hidden shrink-0 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:block"
            >
              Suchen
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/sale"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:translate-y-[-2px] hover:shadow-xl hover:shadow-primary/25"
            >
              Deals entdecken
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/produkte"
              className="inline-flex items-center rounded-xl border border-border bg-background px-6 py-3.5 text-sm font-semibold transition-all hover:translate-y-[-2px] hover:bg-muted"
            >
              Alle Produkte
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
