'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckoutCancelledNotice,
  CheckoutStepper,
  OrderSummary,
  PAYMENT_METHODS,
  PaymentStep,
  ReviewStep,
  ShippingStep,
  clearCheckoutShippingDraft,
  createDefaultShippingData,
  getShippingValidationError,
  getShippingCost,
  buildCheckoutPayload,
  readCheckoutShippingDraft,
  useCheckoutRetrySession,
  writeCheckoutShippingDraft,
  type CheckoutStep,
  type CheckoutSessionResponse,
  type PaymentMethod,
} from '@/features/checkout'
import { SEGMENT_LABELS, useCustomerSegmentStore } from '@/features/segment'
import { getAuthHeaders } from '@/lib/api/auth'
import { trackEvent } from '@/lib/analytics'
import { useCartStore } from '@/lib/store'
import { CheckoutPageHeader, EmptyCheckoutCartState } from './CheckoutPageSections'

export default function CheckoutPage() {
  const items = useCartStore((state) => state.items)
  const total = useCartStore((state) => state.total)
  const itemCount = useCartStore((state) => state.itemCount)
  const segment = useCustomerSegmentStore((state) => state.segment)
  const [step, setStep] = useState<CheckoutStep>('shipping')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card')
  const [shippingData, setShippingData] = useState(() => readCheckoutShippingDraft() || createDefaultShippingData())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkoutCancelled, setCheckoutCancelled] = useState(false)
  const [cancelledOrderID, setCancelledOrderID] = useState<string | null>(null)
  const idempotencyKeyRef = useRef<string>('')
  const hasTrackedBeginCheckoutRef = useRef(false)

  const shippingCost = useMemo(() => getShippingCost(total), [total]); const grandTotal = total + shippingCost
  const retryCheckoutURL = useCheckoutRetrySession(cancelledOrderID)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setCheckoutCancelled(params.get('cancelled') === 'true')
    setCancelledOrderID(params.get('order_id'))
  }, [])

  useEffect(() => {
    if (hasTrackedBeginCheckoutRef.current) {
      return
    }
    hasTrackedBeginCheckoutRef.current = true
    void trackEvent('begin_checkout', {
      payload: {
        item_count: itemCount,
        total: grandTotal,
      },
    })
  }, [grandTotal, itemCount])

  useEffect(() => {
    writeCheckoutShippingDraft(shippingData)
  }, [shippingData])

  if (items.length === 0) {
    return <EmptyCheckoutCartState />
  }

  const goBack = () => {
    if (step === 'payment') setStep('shipping')
    if (step === 'review') setStep('payment')
  }

  const goNext = async () => {
    if (step === 'shipping') {
      const validationError = getShippingValidationError(shippingData)
      if (validationError) {
        setError(validationError)
        return
      }
      setError(null)
      setStep('payment')
      await trackEvent('checkout_step_completed', { payload: { step: 'shipping' } })
      return
    }

    if (step === 'payment') {
      setStep('review')
      await trackEvent('checkout_step_completed', { payload: { step: 'payment', method: paymentMethod } })
    }
  }

  const submitCheckout = async () => {
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = crypto.randomUUID()
    }
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: await getAuthHeaders({
          'content-type': 'application/json',
          'idempotency-key': idempotencyKeyRef.current,
        }),
        body: JSON.stringify(buildCheckoutPayload(shippingData, segment, shippingCost, items)),
      })

      if (!response.ok) {
        const parsed = await response.json().catch(() => ({ error: 'checkout_failed' }))
        const reason = parsed.error || 'checkout_failed'
        if (reason === 'product_unavailable_for_checkout') {
          throw new Error('Ein oder mehrere Artikel sind aktuell nicht für den Live-Versand verfügbar. Bitte Warenkorb prüfen.')
        }
        throw new Error(reason)
      }

      const body = (await response.json()) as CheckoutSessionResponse
      if (!body.checkout_url) {
        throw new Error('checkout_url_missing')
      }

      await trackEvent('checkout_step_completed', {
        payload: {
          step: 'review',
          method: paymentMethod,
          order_id: body.order_id,
        },
      })

      clearCheckoutShippingDraft()
      window.location.href = body.checkout_url
    } catch (checkoutError) {
      await trackEvent('checkout_error', {
        payload: {
          step,
          message: checkoutError instanceof Error ? checkoutError.message : 'checkout_failed',
        },
      })
      setError(checkoutError instanceof Error ? checkoutError.message : 'Bestellung konnte nicht abgeschlossen werden.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="shell-container py-10">
      <CheckoutPageHeader segmentLabel={SEGMENT_LABELS[segment]} />
      {checkoutCancelled ? (
        <CheckoutCancelledNotice
          retryCheckoutURL={retryCheckoutURL}
          onRetryReview={() => setStep('review')}
          onSupportClick={() => {
            void trackEvent('contact_support_clicked', {
              payload: { source: 'checkout_cancelled' },
            })
          }}
        />
      ) : null}

      <CheckoutStepper currentStep={step} />

      <div className="grid gap-6 lg:grid-cols-[1.45fr_0.9fr]">
        <section className="rounded-[1.7rem] border border-brand-border bg-white/90 p-6 shadow-[0_12px_30px_rgba(10,10,10,0.08)]">
          {step === 'shipping' ? <ShippingStep shippingData={shippingData} segment={segment} onChange={setShippingData} onContinue={goNext} /> : null}
          {step === 'payment' ? <PaymentStep method={paymentMethod} onMethodChange={setPaymentMethod} onBack={goBack} onContinue={goNext} /> : null}
          {step === 'review' ? (
            <ReviewStep
              shippingData={shippingData}
              items={items}
              paymentLabel={PAYMENT_METHODS.find((entry) => entry.id === paymentMethod)?.label || 'Karte oder Link'}
              isSubmitting={loading}
              onBack={goBack}
              onEditShipping={() => setStep('shipping')}
              onEditPayment={() => setStep('payment')}
              onSubmit={submitCheckout}
            />
          ) : null}
          {error ? (
            <p role="alert" aria-live="polite" className="mt-4 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </section>

        <OrderSummary subtotal={total} shipping={shippingCost} total={grandTotal} />
      </div>
    </main>
  )
}
