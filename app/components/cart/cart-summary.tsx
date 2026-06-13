// Purpose: Order summary sidebar — subtotal, shipping, free-shipping progress,
// coupon input, estimated delivery, trust badges
// Docs: PLAN-VERKAUFSFAEHIG.md

'use client'

import { useState, useTransition } from 'react'
import { SHIPPING } from '@/lib/shipping-constants'
import { formatEuro } from '@/lib/format'
import { CheckoutButton } from '@/components/CheckoutButton'
import { TrustBadges } from '@/components/conversion/trust-badges'
import { TruckIcon, TagIcon, ClockIcon, GiftIcon } from 'lucide-react'

function getEstimatedDelivery(): { min: string; max: string } {
  const now = new Date()
  const min = new Date(now)
  const max = new Date(now)
  let addedMin = 0
  let addedMax = 0
  while (addedMin < SHIPPING.deliveryDaysMin) {
    min.setDate(min.getDate() + 1)
    if (min.getDay() !== 0 && min.getDay() !== 6) addedMin++
  }
  while (addedMax < SHIPPING.deliveryDaysMax) {
    max.setDate(max.getDate() + 1)
    if (max.getDay() !== 0 && max.getDay() !== 6) addedMax++
  }
  const fmt = (d: Date) =>
    d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })
  return { min: fmt(min), max: fmt(max) }
}

export function CartSummary({
  subtotalCents,
  shippingCents,
  grandTotalCents,
  freeShippingProgress,
  qualifiesForFreeShipping,
  missingForFreeCents,
}: {
  subtotalCents: number
  shippingCents: number
  grandTotalCents: number
  freeShippingProgress: number
  qualifiesForFreeShipping: boolean
  missingForFreeCents: number
}) {
  const [couponCode, setCouponCode] = useState('')
  const [couponPending, startCouponTransition] = useTransition()
  const [couponError, setCouponError] = useState<string | null>(null)
  const [couponApplied, setCouponApplied] = useState(false)

  const delivery = getEstimatedDelivery()

  function handleApplyCoupon() {
    if (!couponCode.trim()) return
    setCouponError(null)
    startCouponTransition(async () => {
      await new Promise((r) => setTimeout(r, 600))
      setCouponError('Gutscheincode nicht gefunden.')
      setCouponApplied(false)
    })
  }

  return (
    <aside className="h-fit rounded-lg border border-border bg-card p-6 lg:sticky lg:top-20">
      <h2 className="mb-4 text-lg font-semibold">Zusammenfassung</h2>

      {/* ── Free-shipping progress bar ─────────────────────────────── */}
      <div
        className={
          'mb-4 rounded-lg p-3 ' +
          (qualifiesForFreeShipping ? 'bg-success/10' : 'bg-accent/10')
        }
      >
        {qualifiesForFreeShipping ? (
          <p className="flex items-center gap-1.5 text-sm font-medium text-success">
            <GiftIcon className="size-4" aria-hidden />
            Du erhältst kostenlosen Versand!
          </p>
        ) : (
          <div className="flex items-start gap-1.5 text-sm">
            <TruckIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              Noch{' '}
              <span className="font-semibold">
                {formatEuro(missingForFreeCents)}
              </span>{' '}
              bis zum kostenlosen Versand.
            </span>
          </div>
        )}
        <div
          role="progressbar"
          aria-valuenow={freeShippingProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Fortschritt Gratisversand"
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-background/50"
        >
          <div
            className={
              'h-full rounded-full transition-all ' +
              (qualifiesForFreeShipping ? 'bg-success' : 'bg-accent')
            }
            style={{ width: `${freeShippingProgress}%` }}
          />
        </div>
        {!qualifiesForFreeShipping && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Gratis Versand ab {formatEuro(SHIPPING.freeAboveCents)}
          </p>
        )}
      </div>

      {/* ── Price breakdown ────────────────────────────────────────── */}
      <dl className="flex flex-col gap-2 border-b border-border pb-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Zwischensumme</dt>
          <dd className="tabular-nums">{formatEuro(subtotalCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Versand</dt>
          <dd className="tabular-nums">
            {shippingCents === 0 ? 'Kostenlos' : formatEuro(shippingCents)}
          </dd>
        </div>
      </dl>
      <div className="flex justify-between py-4">
        <span className="font-semibold">Gesamt</span>
        <span className="text-lg font-bold tabular-nums">
          {formatEuro(grandTotalCents)}
        </span>
      </div>

      {/* ── Coupon code ───────────────────────────────────────────── */}
      <div className="mb-4 border-b border-border pb-4">
        <label
          htmlFor="coupon-input"
          className="mb-1.5 flex items-center gap-1.5 text-sm font-medium"
        >
          <TagIcon className="size-4" aria-hidden />
          Gutscheincode
        </label>
        <div className="flex gap-2">
          <input
            id="coupon-input"
            type="text"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="Code eingeben"
            className="field-input flex-1"
            disabled={couponPending || couponApplied}
          />
          <button
            type="button"
            onClick={handleApplyCoupon}
            disabled={couponPending || !couponCode.trim() || couponApplied}
            className="btn btn-outline btn-md shrink-0"
          >
            {couponPending ? '…' : couponApplied ? '✓' : 'Anwenden'}
          </button>
        </div>
        {couponError && (
          <p role="alert" className="mt-1.5 text-xs text-destructive">
            {couponError}
          </p>
        )}
        {couponApplied && (
          <p className="mt-1.5 text-xs text-success">
            Gutscheincode angewendet!
          </p>
        )}
      </div>

      {/* ── Estimated delivery ─────────────────────────────────────── */}
      <div className="mb-4 flex items-start gap-2 text-sm text-muted-foreground">
        <ClockIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          Voraussichtliche Lieferung:{' '}
          <span className="font-medium text-foreground">
            {delivery.min} – {delivery.max}
          </span>
        </p>
      </div>

      <p className="mb-4 text-xs text-muted-foreground">
        Alle Preise inkl. gesetzlicher MwSt.
      </p>

      {/* ── Checkout button + trust badges (desktop) ───────────────── */}
      <div className="hidden lg:block">
        <CheckoutButton />
        <div className="mt-3">
          <TrustBadges />
        </div>
      </div>
    </aside>
  )
}
