import Link from 'next/link'
import Image from 'next/image'
import {ArrowRight, Search, Truck, ShieldCheck, RotateCcw} from 'lucide-react'
import {getTranslations, getLocale} from 'next-intl/server'
import {getDealProducts} from '@/lib/queries'

function formatEur(value: number, locale: string) {
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

export async function HomeHero() {
  const t = await getTranslations('homeHero')
  const locale = await getLocale()
  const teasers = (await getDealProducts(3)).slice(0, 3)

  return (
    <section className="border-b border-border bg-muted/30">
      <div className="container mx-auto flex flex-col gap-8 px-4 py-10 md:flex-row md:items-center md:gap-10 md:py-16">
        <div className="flex flex-1 flex-col items-start gap-5">
          <span className="rounded-full bg-sale px-3 py-1 text-xs font-bold uppercase tracking-wide text-sale-foreground">
            {t('saveUp')}
          </span>

          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-balance md:text-5xl">
            {t('heading')}{' '}
            <span className="text-primary">{t('headingHighlight')}</span>
          </h1>

          <p className="text-base leading-relaxed text-muted-foreground text-pretty md:text-lg">
            {t('subheading')}
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
              placeholder={t('searchPlaceholder')}
              aria-label={t('searchLabel')}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              {t('searchButton')}
            </button>
          </form>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/sale"
              className="flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              {t('discoverDeals')}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/produkte"
              className="rounded-md border border-border bg-background px-5 py-3 text-sm font-medium hover:bg-muted"
            >
              {t('allProducts')}
            </Link>
          </div>

          <ul className="mt-1 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <Truck className="size-3.5 text-primary" aria-hidden="true" />
              {t('freeFrom')}
            </li>
            <li className="flex items-center gap-1.5">
              <RotateCcw className="size-3.5 text-primary" aria-hidden="true" />
              {t('returnDays')}
            </li>
            <li className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />
              {t('buyerProtection')}
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
                  {formatEur(product.price, locale)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
