// Purpose: Homepage with hero, trust strip, featured products (Step 10)
// Docs: PLAN-VERKAUFSFAEHIG.md

import Link from 'next/link'
import { getFeaturedProducts, getDealProducts } from '@/lib/queries'
import { HomeHero } from '@/components/home-hero'
import { ProductCard } from '@/components/ProductCard'
import { CategoryTiles } from '@/components/home-sections'
import { PopularCategories } from '@/components/popular-categories'
import { RecentlyViewed } from '@/components/product/recently-viewed'
import { TrustStats } from '@/components/trust-stats'
import { HowItWorks } from '@/components/how-it-works'
import { SHIPPING } from '@/lib/shipping'
import { formatEuro } from '@/lib/format'
import {
  TruckIcon,
  ShieldCheckIcon,
  RotateCcwIcon,
  ArrowRightIcon,
} from '@/components/icons'

export const revalidate = 60

const TRUST_ITEMS = [
  {
    icon: TruckIcon,
    title: `Kostenloser Versand ab ${formatEuro(SHIPPING.freeAboveCents)}`,
    description: `Lieferung in ${SHIPPING.deliveryDaysMin}–${SHIPPING.deliveryDaysMax} Werktagen innerhalb Deutschlands`,
  },
  {
    icon: ShieldCheckIcon,
    title: 'Sichere Zahlung',
    description: 'Stripe-verschlüsselt. Deine Daten sind sicher.',
  },
  {
    icon: RotateCcwIcon,
    title: '14 Tage Widerruf',
    description: 'Problemlose Rückgabe gemäß Fernabsatzgesetz',
  },
] as const

export default async function HomePage() {
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

  return (
    <>
      <HomeHero />

      {/* Trust strip */}
      <section
        aria-label="Unsere Versprechen"
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

      {/* Sale products — biggest incentive */}
      {dealProducts.length > 0 && (
        <section className="container mx-auto px-4 py-12">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              <span className="text-sale">Blitzangebote</span>
            </h2>
            <Link
              href="/sale"
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Alle Angebote <ArrowRightIcon className="size-4" />
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {dealProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Featured products */}
      <section id="featured" className="container mx-auto scroll-mt-20 px-4 py-12">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            Unsere Empfehlungen
          </h2>
          <Link
            href="/produkte"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Alle Produkte <ArrowRightIcon className="size-4" />
          </Link>
        </div>

        {featuredProducts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center">
            <p className="font-medium">Noch keine Produkte verfügbar</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Wir arbeiten daran, bald eine Auswahl für dich bereitzustellen.
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
