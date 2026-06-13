import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Search, Truck, ShieldCheck, RotateCcw } from 'lucide-react'
import { getDealProducts, getFeaturedProducts } from '@/lib/queries'

export async function HomeHero() {
  const locale: 'de' | 'en' = 'de'
  // Prefer deal products for the hero teasers; fall back to featured if no deals exist.
  let teasers = (await getDealProducts(3)).slice(0, 3)
  if (teasers.length === 0) {
    teasers = (await getFeaturedProducts(3)).slice(0, 3)
  }

  return (
    <section className="border-b border-border bg-muted/30">
      <div className="container mx-auto flex flex-col gap-8 px-4 py-10 md:flex-row md:items-center md:gap-10 md:py-16">
        <div className="flex flex-1 flex-col items-start gap-5">
          <span className="rounded-full bg-sale px-3 py-1 text-xs font-bold uppercase tracking-wide text-sale-foreground">
            Bis zu -51 % sparen
          </span>

          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-balance md:text-5xl">
            Premium Produkte{' '}
            <span className="text-primary">zu fairen Preisen</span>
          </h1>

          <p className="text-base leading-relaxed text-muted-foreground text-pretty md:text-lg">
            Handverlesene Produkte aus Mode, Wohnen, Elektronik und Lifestyle – mit
            kostenlosem Versand ab 49 € und 14 Tagen Widerrufsrecht.
          </p>

          <form
            action="/suche"
            method="GET"
            role="search"
            className="flex w-full max-w-md items-center gap-2 rounded-lg border border-border bg-background p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-ring"
          >
            <Search className="ml-2 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              name="q"
              required
              placeholder="Wonach suchst du?"
              aria-label="Produkte suchen"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Suchen
            </button>
          </form>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/sale"
              className="flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Deals entdecken
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/produkte"
              className="rounded-md border border-border bg-background px-5 py-3 text-sm font-medium hover:bg-muted"
            >
              Alle Produkte
            </Link>
          </div>

          <ul className="mt-1 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <Truck className="size-3.5 text-primary" aria-hidden="true" />
              Versand ab 49 € gratis
            </li>
            <li className="flex items-center gap-1.5">
              <RotateCcw className="size-3.5 text-primary" aria-hidden="true" />
              14 Tage Widerrufsrecht
            </li>
            <li className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />
              Käuferschutz inklusive
            </li>
          </ul>
        </div>

        {teasers.length > 0 && (
          <div className="grid flex-1 grid-cols-3 gap-3 md:max-w-md">
            {teasers.map((product, i) => (
              <Link
                key={product.id}
                href={`/produkt/${product.id}`}
                className={`group relative overflow-hidden rounded-lg border border-border bg-card ${i === 0 ? 'col-span-2 row-span-2' : ''}`}
              >
                <div className="relative aspect-square">
                  <Image
                    src={product.imageUrl || '/placeholder.svg'}
                    alt={product.title}
                    fill
                    sizes="(max-width: 768px) 33vw, 200px"
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                <span className="absolute bottom-2 left-2 rounded bg-sale px-1.5 py-0.5 text-xs font-bold text-sale-foreground">
                  {product.price.toLocaleString('de-DE', {
                    style: 'currency',
                    currency: 'EUR',
                  })}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}