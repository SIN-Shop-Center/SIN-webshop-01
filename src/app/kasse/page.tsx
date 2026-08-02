import Link from 'next/link'
import { ArrowLeft, Check, CreditCard, LockKeyhole, MapPin, Truck } from 'lucide-react'
import { getCartItems } from '@/lib/actions/cart'
import { getProductsByIds } from '@/lib/queries'
import { CheckoutButton } from '@/components/CheckoutButton'
import { EmptyCart } from '@/components/EmptyCart'
import { OrderSummary } from '@/components/OrderSummary'

export const dynamic = 'force-dynamic'

const CHECKOUT_STEPS = [
  {
    icon: MapPin,
    title: 'Lieferadresse',
    description: 'Deutschland wird als Lieferland geprüft.',
  },
  {
    icon: Truck,
    title: 'Versand',
    description: 'Die verfügbare Versandart wird im Checkout angezeigt.',
  },
  {
    icon: CreditCard,
    title: 'Zahlung',
    description: 'Zahlungsmethode und Rechnungsdaten werden sicher bei Stripe erfasst.',
  },
] as const

export default async function CheckoutPage() {
  const cart = await getCartItems()
  if (!cart.length) return <EmptyCart />

  const products = await getProductsByIds(cart.map((item) => item.product_id))
  const availableIds = new Set(products.map((product) => product.id))
  const unavailableItems = cart.filter((item) => !availableIds.has(item.product_id))

  if (!products.length) return <EmptyCart />

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <Link
        href="/warenkorb"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Zurück zum Warenkorb
      </Link>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <div>
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              <LockKeyhole className="size-3.5" aria-hidden />
              Sicherer Checkout
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              Bestellung prüfen
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
              Kontrolliere deine Produkte. Im nächsten Schritt übernimmt Stripe Lieferadresse,
              Versand und Zahlung in einem geschützten Checkout.
            </p>
          </div>

          {unavailableItems.length ? (
            <div className="mt-6 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
              {unavailableItems.length} Artikel sind nicht mehr verfügbar und werden nicht an Stripe übergeben.
              Bitte entferne sie im Warenkorb, bevor du fortfährst.
            </div>
          ) : null}

          <section className="mt-8 rounded-2xl border border-border bg-card">
            <div className="border-b border-border px-5 py-4 sm:px-6">
              <h2 className="font-semibold tracking-tight">So geht es weiter</h2>
            </div>
            <ol className="divide-y divide-border">
              {CHECKOUT_STEPS.map(({ icon: Icon, title, description }, index) => (
                <li key={title} className="flex gap-4 px-5 py-5 sm:px-6">
                  <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-muted/30">
                    <Icon className="size-4" strokeWidth={1.8} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">{title}</p>
                      <span className="text-xs font-medium tabular-nums text-muted-foreground">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <div className="mt-6 rounded-2xl border border-border bg-muted/20 p-5">
            <div className="flex items-start gap-3">
              <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
              <div>
                <p className="text-sm font-semibold">Preise und Bestand werden serverseitig erneut geprüft</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Der Browser sendet keine vertrauenswürdigen Preise an Stripe. Der Checkout liest die aktuellen
                  Produktdaten und den Warenkorb erneut aus der Datenbank.
                </p>
              </div>
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-24">
          <OrderSummary cart={cart} products={products} />
          <div className="mt-4 rounded-2xl border border-border bg-card p-5">
            <CheckoutButton />
          </div>
        </aside>
      </div>
    </div>
  )
}
