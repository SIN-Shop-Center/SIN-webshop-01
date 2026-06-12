// Purpose: Homepage with hero, trust strip, featured products (Step 10)
// Docs: PLAN-VERKAUFSFAEHIG.md

import Link from 'next/link'
import { getFeaturedProducts } from '@/lib/queries'
import { HomeHero } from '@/components/home-hero'
import { ProductCard } from '@/components/ProductCard'
import { CategoryTiles } from '@/components/home-sections'
import { NewsletterSignup } from '@/components/newsletter-signup'
import { RecentlyViewed } from '@/components/conversion/recently-viewed'
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
  try {
    featuredProducts = await getFeaturedProducts()
  } catch {
    featuredProducts = []
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

      {/* Featured products */}
      <section id="featured" className="container mx-auto scroll-mt-20 px-4 py-16">
        <div className="mb-8 flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            Unsere Empfehlungen
          </h2>
          <p className="text-muted-foreground">
            Eine kuratierte Auswahl unserer beliebtesten Produkte.
          </p>
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

      <NewsletterSignup />
      <RecentlyViewed />
    </>
  )
}
