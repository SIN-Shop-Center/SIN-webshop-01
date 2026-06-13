import Link from 'next/link'
import {useTranslations} from 'next-intl'
import {setRequestLocale} from 'next-intl/server'
import type {Metadata} from 'next'
import {getFeaturedProducts, getDealProducts} from '@/lib/queries'
import {HomeHero} from '@/components/home-hero'
import {ProductCard} from '@/components/ProductCard'
import {CategoryTiles} from '@/components/home-sections'
import {PopularCategories} from '@/components/popular-categories'
import {RecentlyViewed} from '@/components/product/recently-viewed'
import {TrustStats} from '@/components/trust-stats'
import {HowItWorks} from '@/components/how-it-works'
import {SHIPPING} from '@/lib/shipping'
import {formatEuro} from '@/lib/format'
import {
  TruckIcon,
  ShieldCheckIcon,
  RotateCcwIcon,
  ArrowRightIcon,
} from '@/components/icons'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://shopsin.delqhi.com'

export const metadata: Metadata = {
  title: 'ShopSIN — Dein Alltag. Unser Sortiment.',
  description:
    'Handverlesene Produkte aus Mode, Wohnen, Elektronik und mehr — mit kostenlosem Versand ab 49 €.',
  openGraph: {
    title: 'ShopSIN — Dein Alltag. Unser Sortiment.',
    description:
      'Handverlesene Produkte aus Mode, Wohnen, Elektronik und mehr — mit kostenlosem Versand ab 49 €.',
    url: APP_URL,
    type: 'website',
    images: [{ url: `${APP_URL}/og-image.png`, width: 1200, height: 630, alt: 'ShopSIN' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ShopSIN — Dein Alltag. Unser Sortiment.',
    description:
      'Handverlesene Produkte aus Mode, Wohnen, Elektronik und mehr — mit kostenlosem Versand ab 49 €.',
    images: [`${APP_URL}/og-image.png`],
  },
  alternates: {
    canonical: APP_URL,
  },
}

const websiteLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'ShopSIN',
  url: APP_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${APP_URL}/suche?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
}

export const revalidate = 60

type Props = {
  params: Promise<{locale: string}>
}

export default async function HomePage({params}: Props) {
  const {locale} = await params
  setRequestLocale(locale)

  const t = useTranslations('home')

  let featuredProducts: Awaited<ReturnType<typeof getFeaturedProducts>> = []
  let dealProducts: Awaited<ReturnType<typeof getDealProducts>> = []
  try {
    [featuredProducts, dealProducts] = await Promise.all([
      getFeaturedProducts(),
      getDealProducts(8),
    ])
  } catch {
    featuredProducts = []
    dealProducts = []
  }

  const TRUST_ITEMS = [
    {
      icon: TruckIcon,
      title: t('freeShippingTitle', {amount: formatEuro(SHIPPING.freeAboveCents)}),
      description: t('freeShippingDesc', {min: SHIPPING.deliveryDaysMin, max: SHIPPING.deliveryDaysMax}),
    },
    {
      icon: ShieldCheckIcon,
      title: t('securePaymentTitle'),
      description: t('securePaymentDesc'),
    },
    {
      icon: RotateCcwIcon,
      title: t('returnTitle'),
      description: t('returnDesc'),
    },
  ] as const

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
      />
      <HomeHero />

      <section
        aria-label={t('trustStripLabel')}
        className="border-b border-border bg-muted/30"
      >
        <div className="container mx-auto grid gap-6 px-4 py-8 sm:grid-cols-3">
          {TRUST_ITEMS.map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-background text-primary ring-1 ring-border">
                <item.icon className="size-5" aria-hidden />
              </div>
              <div>
                <p className="font-semibold">{item.title}</p>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <CategoryTiles />
      <PopularCategories />

      {dealProducts.length > 0 && (
        <section className="container mx-auto px-4 py-12">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              <span className="text-sale">{t('dealsHeading')}</span>
            </h2>
            <Link
              href="/sale"
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              {t('allDeals')} <ArrowRightIcon className="size-4" />
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {dealProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      <section id="featured" className="container mx-auto scroll-mt-20 px-4 py-12">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            {t('featuredHeading')}
          </h2>
          <Link
            href="/produkte"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {t('allProducts')} <ArrowRightIcon className="size-4" />
          </Link>
        </div>

        {featuredProducts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center">
            <p className="font-medium">{t('noProductsTitle')}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('noProductsDesc')}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      <TrustStats />
      <HowItWorks />
      <RecentlyViewed />
    </>
  )
}
