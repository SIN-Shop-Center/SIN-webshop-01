import Link from '@/components/ui/Link'
import { useMemo, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import type { ShippingData } from '@/features/checkout/types'
import type { CartItem } from '@/types'
import { formatPrice } from '@/lib/utils'

type ReviewStepProps = {
  shippingData: ShippingData
  items: CartItem[]
  paymentLabel: string
  isSubmitting: boolean
  onBack: () => void
  onEditShipping: () => void
  onEditPayment: () => void
  onSubmit: () => void
}

export function ReviewStep({
  shippingData,
  items,
  paymentLabel,
  isSubmitting,
  onBack,
  onEditShipping,
  onEditPayment,
  onSubmit,
}: ReviewStepProps) {
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const hasCompanyDetails = Boolean(shippingData.companyName.trim() || shippingData.vatId.trim() || shippingData.purchaseOrderRef.trim())
  const canSubmit = useMemo(
    () => acceptedTerms && acceptedPrivacy && !isSubmitting,
    [acceptedPrivacy, acceptedTerms, isSubmitting],
  )

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl">Bestellung prüfen</h2>
        <p className="mt-2 text-sm leading-7 text-brand-text-muted">
          Bitte prüfe deine Bestellung. Im nächsten Schritt schließt du den Kauf sicher ab.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <div className="rounded-[1.4rem] border border-brand-border bg-brand-bg p-4 text-sm text-brand-text-muted">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-brand-text">Lieferung an</p>
                <p className="mt-2 leading-7">
                  {shippingData.firstName} {shippingData.lastName}
                  <br />
                  {shippingData.street}
                  <br />
                  {shippingData.zip} {shippingData.city}
                  <br />
                  {shippingData.email}
                  {shippingData.phone.trim() ? (
                    <>
                      <br />
                      {shippingData.phone}
                    </>
                  ) : null}
                </p>
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={onEditShipping}>
                Adresse ändern
              </Button>
            </div>
            {hasCompanyDetails ? (
              <div className="mt-4 border-t border-brand-border pt-4">
                <p className="font-semibold text-brand-text">Firmenangaben</p>
                <p className="mt-2 leading-7">
                  {shippingData.companyName.trim() ? <>{shippingData.companyName}<br /></> : null}
                  {shippingData.vatId.trim() ? <>USt-IdNr.: {shippingData.vatId}<br /></> : null}
                  {shippingData.purchaseOrderRef.trim() ? <>Bestellreferenz: {shippingData.purchaseOrderRef}</> : null}
                </p>
              </div>
            ) : null}
          </div>

          <div className="rounded-[1.4rem] border border-brand-border bg-white p-4 text-sm text-brand-text-muted">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-brand-text">Zahlungsart</p>
                <p className="mt-2 text-sm font-medium text-brand-text">{paymentLabel}</p>
                <p className="mt-1 text-xs leading-6 text-brand-text-muted">
                  Die finale Zahlungsfreigabe erfolgt erst beim Zahlungsanbieter.
                </p>
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={onEditPayment}>
                Zahlung ändern
              </Button>
            </div>
          </div>

          <div className="rounded-[1.4rem] border border-brand-border bg-white p-4 text-sm text-brand-text-muted">
            <p className="font-semibold text-brand-text">Deine Vorteile bei uns</p>
            <div className="mt-3 grid gap-2">
              <p className="rounded-xl border border-brand-border bg-brand-bg px-3 py-2">
                Kostenloser Versand ab 50€ Bestellwert. Schnelle Lieferung direkt zu dir nach Hause.
              </p>
              <p className="rounded-xl border border-brand-border bg-brand-bg px-3 py-2">
                30 Tage Rückgaberecht. Du kannst Artikel problemlos und stressfrei zurücksenden.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-brand-text">Artikel in dieser Bestellung</p>
          {items.map((item) => (
            <article key={item.id} className="flex items-center gap-3 rounded-[1.35rem] border border-brand-border bg-white px-3 py-3">
              <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-brand-bg">
                <Image src={item.image} alt={item.name} fill className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-semibold text-brand-text">{item.name}</p>
                <p className="text-xs text-brand-text-muted">Menge: {item.quantity}</p>
              </div>
              <p className="text-sm font-semibold text-brand-text">{formatPrice(item.price * item.quantity)}</p>
            </article>
          ))}
        </div>
      </div>

      <p className="rounded-xl border border-brand-border bg-white px-4 py-3 text-xs text-brand-text-muted">
        Mit Klick auf &quot;Zahlungspflichtig bestellen&quot; öffnet sich der Zahlungsanbieter mit allen Zahlungsdaten zur finalen Freigabe.
      </p>

      <div className="space-y-2 rounded-xl border border-brand-border bg-white px-4 py-4 text-xs text-brand-text-muted">
        <p className="font-semibold text-brand-text">Rechtlich erforderlich</p>
        <label className="inline-flex items-start gap-2">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(event) => setAcceptedTerms(event.target.checked)}
            className="mt-0.5"
          />
          <span>
            Ich akzeptiere die{' '}
            <Link href="/agb" className="font-semibold hover:underline">
              AGB
            </Link>{' '}
            und das{' '}
            <Link href="/widerrufsrecht" className="font-semibold hover:underline">
              Widerrufsrecht
            </Link>
            .
          </span>
        </label>
        <label className="inline-flex items-start gap-2">
          <input
            type="checkbox"
            checked={acceptedPrivacy}
            onChange={(event) => setAcceptedPrivacy(event.target.checked)}
            className="mt-0.5"
          />
          <span>
            Ich habe die{' '}
            <Link href="/datenschutz" className="font-semibold hover:underline">
              Datenschutzerklärung
            </Link>{' '}
            gelesen.
          </span>
        </label>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} fullWidth>
          Zurück
        </Button>
        <Button onClick={onSubmit} isLoading={isSubmitting} disabled={!canSubmit} fullWidth>
          Zahlungspflichtig bestellen
        </Button>
      </div>
    </div>
  )
}
