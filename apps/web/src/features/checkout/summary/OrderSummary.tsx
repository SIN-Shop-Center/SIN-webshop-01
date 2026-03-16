import { ShieldCheck } from 'lucide-react'
import { TrustPanel } from '@/features/trust'
import { CHECKOUT_TRUST_SIGNALS } from '@/features/trust/signals'
import { FREE_SHIPPING_THRESHOLD } from '@/features/checkout/constants'
import { formatPrice } from '@/lib/utils'

type OrderSummaryProps = {
  subtotal: number
  shipping: number
  total: number
}

export function OrderSummary({ subtotal, shipping, total }: OrderSummaryProps) {
  const remainingFreeShipping = Math.max(FREE_SHIPPING_THRESHOLD - subtotal, 0)
  const shippingProgress = Math.max(0, Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100))

  return (
    <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
      <section className="rounded-[1.7rem] border border-brand-border bg-white p-5 shadow-[0_10px_26px_rgba(10,10,10,0.06)]">
        <h2 className="text-xl">Deine Bestellübersicht</h2>
        <p className="mt-1 text-sm text-brand-text-muted">Alle Kosten vor dem letzten Schritt sichtbar.</p>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-brand-text-muted">Zwischensumme</span>
            <span className="text-brand-text">{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-brand-text-muted">Versand</span>
            <span className="text-brand-text">{shipping === 0 ? 'Kostenlos' : formatPrice(shipping)}</span>
          </div>
          <div className="mt-2 border-t border-brand-border pt-3 text-base font-semibold">
            <div className="flex justify-between">
              <span className="text-brand-text">Gesamt</span>
              <span className="text-brand-text">{formatPrice(total)}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-brand-border bg-brand-bg px-3 py-3">
          {shipping === 0 ? (
            <p className="text-xs font-semibold text-brand-success">Kostenloser Versand aktiv</p>
          ) : (
            <p className="text-xs text-brand-text-muted">
              Noch {formatPrice(remainingFreeShipping)} bis kostenloser Versand.
            </p>
          )}
          <div
            className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white"
            role="progressbar"
            aria-label="Fortschritt zum kostenlosen Versand"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(shippingProgress)}
          >
            <div className="h-full rounded-full bg-black transition-[width] duration-300" style={{ width: `${shippingProgress}%` }} />
          </div>
        </div>

        <p className="mt-3 inline-flex items-center gap-1 text-xs text-brand-text-muted">
          <ShieldCheck className="h-3.5 w-3.5 text-brand-text" />
          Keine versteckten Zusatzkosten und klare Pflichtangaben
        </p>
      </section>

      <TrustPanel title="Sicherer Checkout" signals={CHECKOUT_TRUST_SIGNALS} compact />
    </aside>
  )
}
