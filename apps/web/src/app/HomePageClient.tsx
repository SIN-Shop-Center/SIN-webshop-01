'use client'

import { useMemo } from 'react'
import Link from '@/components/ui/Link'
import { ArrowRight, BadgeCheck, Clock3, ShieldCheck } from 'lucide-react'
import { JsonLd } from '@/components/seo/JsonLd'
import {
  getBestsellerProducts,
  getFastShippingProducts,
  getProductsForUseCase,
  getRecentlyViewedProducts,
  getTopRatedProducts,
  getValuePicks,
} from '@/features/catalog'
import {
  HeroSection,
  HomeCollectionSection,
  HomeComparisonShelf,
  HomeQuickEntryStrip,
  SegmentEntryCards,
  ValuePropsGrid,
} from '@/features/home'
import { SEGMENT_LABELS, useCustomerSegmentStore } from '@/features/segment'
import { PRIMARY_TRUST_SIGNALS, TrustInlineBar } from '@/features/trust'
import { useExperimentVariant } from '@/lib/experiments'
import { useCommerceStore } from '@/lib/store'
import { buildProductListJsonLd } from '@/lib/seo'
import { cn } from '@/lib/utils'
import type { Product } from '@/types'

type HomePageClientProps = {
  initialProducts: Product[]
}

export function HomePageClient({ initialProducts }: HomePageClientProps) {
  const buttonLinkClassName = cn(
    'inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-150',
    'cta-secondary',
  )
  const segment = useCustomerSegmentStore((state) => state.segment)
  const recentlyViewedIds = useCommerceStore((state) => state.recentlyViewedIds)
  const heroVariant = useExperimentVariant({
    experimentId: 'home_hero_copy_v1',
    variants: ['control', 'trust'] as const,
  })

  const bestsellers = useMemo(() => getBestsellerProducts(initialProducts, 4), [initialProducts])
  const fastShipping = useMemo(() => getFastShippingProducts(initialProducts, 4), [initialProducts])
  const valuePicks = useMemo(
    () => getValuePicks(initialProducts, segment === 'b2b' ? 100 : 80, 4),
    [initialProducts, segment],
  )
  const useCaseProducts = useMemo(
    () => getProductsForUseCase(initialProducts, segment === 'b2b' ? 'Home Office' : 'Routine Start', 4),
    [initialProducts, segment],
  )
  const comparisonProducts = useMemo(() => getTopRatedProducts(initialProducts, 3), [initialProducts])
  const recentlyViewed = useMemo(
    () => getRecentlyViewedProducts(initialProducts, recentlyViewedIds, 4),
    [initialProducts, recentlyViewedIds],
  )
  const quickEntries = useMemo(
    () =>
      segment === 'b2b'
        ? [
            { label: 'Beschaffung starten', description: 'Bestseller für Teams', href: '/products?segment=b2b&badge=bestseller' },
            { label: 'Home Office', description: 'Technik und Setup für den Arbeitsplatz', href: '/products?segment=b2b&useCase=Home%20Office' },
            { label: 'Schnell lieferbar', description: 'Bestand für direkte Nachbestellung', href: '/products?segment=b2b&delivery=fast' },
            { label: 'Preisfokus', description: 'Klare Picks unter 100 Euro', href: '/products?segment=b2b&pricePreset=100' },
          ]
        : [
            { label: 'Bestseller sehen', description: 'Beliebte Produkte mit sozialem Beweis', href: '/products?badge=bestseller' },
            { label: 'Routine starten', description: 'Pflege und Alltag ohne Overload', href: '/products?useCase=Routine%20Start' },
            { label: 'Schnell lieferbar', description: 'Produkte für heute entscheidbare Käufe', href: '/products?delivery=fast' },
            { label: 'Geschenke & Favoriten', description: 'Starke Picks für klare Geschenkideen', href: '/products?useCase=Geschenke' },
          ],
    [segment],
  )

  const featuredProductsJsonLd = useMemo(
    () => buildProductListJsonLd(bestsellers, 'Empfohlene Produkte', '/'),
    [bestsellers],
  )

  return (
    <main className="pb-20">
      <JsonLd id="home-featured-products" data={featuredProductsJsonLd} />
      <HeroSection segment={segment} variant={heroVariant} />
      <HomeQuickEntryStrip entries={quickEntries} />

      <section className="shell-container mt-7">
        <div className="rounded-[1.7rem] border border-brand-border bg-white px-5 py-5 shadow-[0_10px_30px_rgba(10,10,10,0.05)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="section-eyebrow">Vertrauen im Kaufmoment</p>
              <h2 className="mt-1 text-2xl md:text-3xl">Weniger Ablenkung, mehr Orientierung.</h2>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-brand-text-muted">
              <span className="rounded-full border border-brand-border bg-brand-bg px-3 py-1.5">{bestsellers.length} kuratierte Produkte</span>
              <span className="rounded-full border border-brand-border bg-brand-bg px-3 py-1.5">{SEGMENT_LABELS[segment]}</span>
            </div>
          </div>
          <TrustInlineBar signals={PRIMARY_TRUST_SIGNALS} />
        </div>
      </section>

      <HomeCollectionSection
        eyebrow={segment === 'b2b' ? 'Direkt für Teams' : 'Direkt für den Alltag'}
        title={segment === 'b2b' ? 'Schnell beschaffbare Kernartikel' : 'Bestseller mit sofort erkennbarem Nutzen'}
        description="Preis, Lieferung und soziale Signale stehen direkt in den Karten. Die Kaufentscheidung soll vor dem Klick leichter werden, nicht erst danach."
        ctaLabel="Zum gesamten Sortiment"
        ctaHref={segment === 'b2b' ? '/products?segment=b2b' : '/products'}
        emptyMessage="Noch keine Produkte verfügbar"
        products={bestsellers}
      />

      <HomeComparisonShelf products={comparisonProducts} />

      <HomeCollectionSection
        eyebrow="Schneller Kaufmoment"
        title="Schnell lieferbar und direkt einsortierbar"
        description="Diese Auswahl reduziert Wartezeit und Unsicherheit. Besonders stark für Besucher, die heute schon entscheiden wollen."
        ctaLabel="Schnell lieferbar filtern"
        ctaHref={segment === 'b2b' ? '/products?segment=b2b&delivery=fast' : '/products?delivery=fast'}
        emptyMessage="Noch keine Schnell-Lieferartikel verfügbar"
        products={fastShipping}
      />

      <HomeCollectionSection
        eyebrow={segment === 'b2b' ? 'Budgetfreundlich' : 'Preiswerte Favoriten'}
        title={segment === 'b2b' ? 'Starke Picks mit klarem Preisrahmen' : 'Produkte mit gutem Einstiegspreis'}
        description="Eine eigene Preisfläche hilft gegen Entscheidungsermüdung. Besucher sehen schneller, was in den Rahmen passt."
        ctaLabel={segment === 'b2b' ? 'Unter 100 Euro ansehen' : 'Value Picks ansehen'}
        ctaHref={segment === 'b2b' ? '/products?segment=b2b&pricePreset=100' : '/products?pricePreset=80'}
        emptyMessage="Noch keine Preisfavoriten verfügbar"
        products={valuePicks}
      />

      <HomeCollectionSection
        eyebrow={segment === 'b2b' ? 'Wiederholbare Aufgaben' : 'Routine ohne Overload'}
        title={segment === 'b2b' ? 'Home-Office- und Routine-Picks' : 'Sortierte Produkte für den ersten klaren Nutzen'}
        description="Use-Case-Einstiege verhalten sich näher wie Apple und reduzieren Reibung gegenüber reiner Kategoriesuche."
        ctaLabel={segment === 'b2b' ? 'Home Office filtern' : 'Routine Start ansehen'}
        ctaHref={segment === 'b2b' ? '/products?segment=b2b&useCase=Home%20Office' : '/products?useCase=Routine%20Start'}
        emptyMessage="Noch keine passenden Use-Case-Produkte verfügbar"
        products={useCaseProducts}
      />

      {recentlyViewed.length > 0 ? (
        <HomeCollectionSection
          eyebrow="Wieder aufnehmen"
          title="Zuletzt angesehene Produkte"
          description="Rückkehrer sollen nicht neu suchen müssen. Diese Reihe nimmt den Faden direkt wieder auf."
          ctaLabel="Zum Sortiment"
          ctaHref={segment === 'b2b' ? '/products?segment=b2b' : '/products'}
          emptyMessage="Noch keine zuletzt angesehenen Produkte"
          products={recentlyViewed}
        />
      ) : null}

      <ValuePropsGrid />
      <SegmentEntryCards />

      <section className="shell-container mt-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-eyebrow">Kaufprozess</p>
            <h2 className="mt-2 text-3xl md:text-4xl">Drei klare Schritte statt Checkout-Chaos.</h2>
          </div>
          <Link href="/faq" className={buttonLinkClassName}>
            <span>Fragen vor dem Kauf</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-[1.5rem] border border-brand-border bg-white p-5 shadow-[0_8px_24px_rgba(10,10,10,0.04)]">
            <BadgeCheck className="h-5 w-5 text-brand-text" />
            <h3 className="mt-3 text-xl">1. Produkt finden</h3>
            <p className="mt-2 text-sm leading-7 text-brand-text-muted">
              Segment, Suche und Filter reduzieren Auswahlstress und führen schneller zum passenden Produkt.
            </p>
          </article>
          <article className="rounded-[1.5rem] border border-brand-border bg-white p-5 shadow-[0_8px_24px_rgba(10,10,10,0.04)]">
            <Clock3 className="h-5 w-5 text-brand-text" />
            <h3 className="mt-3 text-xl">2. Entscheidung prüfen</h3>
            <p className="mt-2 text-sm leading-7 text-brand-text-muted">
              Preis, Lieferung, Rückgabe und Verfügbarkeit bleiben bis zum Warenkorb klar sichtbar.
            </p>
          </article>
          <article className="rounded-[1.5rem] border border-brand-border bg-white p-5 shadow-[0_8px_24px_rgba(10,10,10,0.04)]">
            <ShieldCheck className="h-5 w-5 text-brand-text" />
            <h3 className="mt-3 text-xl">3. Sicher abschließen</h3>
            <p className="mt-2 text-sm leading-7 text-brand-text-muted">
              Im Checkout bleiben nur Adresse, Zahlung und Bestellprüfung. Keine überflüssige Ablenkung.
            </p>
          </article>
        </div>
      </section>
    </main>
  )
}
