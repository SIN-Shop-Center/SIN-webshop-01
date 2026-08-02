import Link from 'next/link'
import { ArrowRight, RotateCcw, ShieldCheck, Truck } from 'lucide-react'
import { getDealProducts, getFeaturedProducts } from '@/lib/queries'
import { HomeHero } from '@/components/home-hero'
import { ProductCard } from '@/components/ProductCard'
import { PopularCategories } from '@/components/popular-categories'
import { RecentlyViewed } from '@/components/product/recently-viewed'
import { SHIPPING } from '@/lib/shipping'
import { formatEuro } from '@/lib/format'

export const revalidate = 60
export const dynamic = 'force-dynamic'

const PROMISES = [
  {
    icon: Truck,
    title: `Versandfrei ab ${formatEuro(SHIPPING.freeAboveCents)}`,
    description: `${SHIPPING.deliveryDaysMin}–${SHIPPING.deliveryDaysMax} Werktage innerhalb Deutschlands.`,
  },
  {
    icon: ShieldCheck,
    title: 'Sicherer Checkout',
    description: 'Adresse, Versand und Zahlung werden geschützt über Stripe abgewickelt.',
  },
  {
    icon: RotateCcw,
    title: '14 Tage Widerruf',
    description: 'Rückgabeinformationen sind vor dem Kauf klar einsehbar.',
  },
] as const

export default async function HomePage() {
  let featuredProducts: Awaited<ReturnType<typeof getFeaturedProducts>> = []
  let dealProducts: Awaited<ReturnType<typeof getDealProducts>> = []

  try {
    ;[featuredProducts, dealProducts] = await Promise.all([
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

      <section aria-label="Einkaufsinformationen" className="border-b border-border">
        <div className="container mx-auto grid gap-0 px-4 sm:grid-cols-3">
          {PROMISES.map(({ icon: Icon, title, description }, index) => (
            <div
              key={title}
              className={`flex gap-3 py-6 sm:px-6 ${index > 0 ? 'border-t border-border sm:border-l sm:border-t-0' : ''}`}
            >
              <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={1.8} aria-hidden />
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <PopularCategories />

      <ProductSection
        id="featured"
        title="Ausgewählte Produkte"
        description="Produkte, deren Daten, Bestand und Freigabestatus den Shop-Gates entsprechen."
        href="/produkte"
        hrefLabel="Alle Produkte"
        products={featuredProducts}
      />

      {dealProducts.length > 0 ? (
        <ProductSection
          title="Aktuelle Preisvorteile"
          description="Nur Produkte mit tatsächlich hinterlegtem Vergleichspreis."
          href="/sale"
          hrefLabel="Alle Preisvorteile"
          products={dealProducts}
          muted
        />
      ) : null}

      <RecentlyViewed />
    </>
  )
}

function ProductSection({
  id,
  title,
  description,
  href,
  hrefLabel,
  products,
  muted = false,
}: {
  id?: string
  title: string
  description: string
  href: string
  hrefLabel: string
  products: Awaited<ReturnType<typeof getFeaturedProducts>>
  muted?: boolean
}) {
  return (
    <section id={id} className={`scroll-mt-20 border-t border-border ${muted ? 'bg-muted/20' : ''}`}>
      <div className="container mx-auto px-4 py-12 sm:py-16">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">{title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
          <Link href={href} className="inline-flex min-h-6 items-center gap-1.5 text-sm font-medium hover:underline">
            {hrefLabel}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        {products.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center">
            <p className="text-sm font-medium">Zurzeit keine freigegebenen Produkte in diesem Bereich.</p>
            <p className="mt-1 text-xs text-muted-foreground">Neue Produkte erscheinen erst nach Abschluss aller Qualitätsprüfungen.</p>
          </div>
        )}
      </div>
    </section>
  )
}
