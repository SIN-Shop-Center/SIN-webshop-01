// Purpose: Sales-oriented hero with deal products teaser
// Docs: AGENTS.md

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Truck, ShieldCheck, RotateCcw } from 'lucide-react'
import { getDealProducts } from '@/lib/queries'

function formatEur(value: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value)
}

export async function HomeHero() {
  const teasers = (await getDealProducts(3)).slice(0, 3)

  return (
    <section className="border-b border-border bg-muted/30">
      <div className="container mx-auto flex flex-col gap-6 px-4 py-8 md:flex-row md:items-center md:gap-10 md:py-12">
        <div className="flex flex-1 flex-col items-start gap-4">
          <span className="rounded-full bg-sale px-3 py-1 text-xs font-bold uppercase tracking-wide text-sale-foreground">
            Bis zu 50 % sparen
          </span>
          <h1 className="text-3xl font-bold leading-tight text-balance md:text-4xl">
            Alles, was du brauchst. Zu Preisen, die du liebst.
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground text-pretty md:text-base">
            Über 50 Produkte aus Mode, Beauty, Haushalt und mehr — täglich neue Deals, gratis Versand ab 49 €.
          </p>
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
          <ul className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <Truck className="size-3.5 text-primary" aria-hidden="true" />
              Gratis ab 49 €
            </li>
            <li className="flex items-center gap-1.5">
              <RotateCcw className="size-3.5 text-primary" aria-hidden="true" />
              14 Tage Rückgabe
            </li>
            <li className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />
              Käuferschutz
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
                  {formatEur(product.price)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
