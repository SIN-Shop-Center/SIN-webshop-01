'use client'

import Link from '@/components/ui/Link'
import { CheckCircle2, LifeBuoy } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  CHECKOUT_SUCCESS_CONTENT,
  CHECKOUT_SUCCESS_STEPS,
  useCheckoutSuccessState,
} from '@/features/checkout'
import { trackEvent } from '@/lib/analytics'
import { PUBLIC_SUPPORT_EMAIL } from '@/lib/public-contact'

export default function CheckoutSuccessPage() {
  const { orderId, sessionId, paymentState, sessionStatus } = useCheckoutSuccessState()
  const content = CHECKOUT_SUCCESS_CONTENT[paymentState]
  const statusTone =
    paymentState === 'paid'
      ? 'bg-green-100 text-green-700'
      : paymentState === 'pending' || paymentState === 'loading'
        ? 'bg-amber-100 text-amber-700'
        : paymentState === 'failed'
          ? 'bg-red-100 text-red-700'
          : 'bg-brand-bg-muted text-brand-text'

  return (
    <main className="shell-container py-14">
      <section className="panel mx-auto max-w-3xl px-6 py-10 text-center md:px-10">
        <div className={`mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full ${statusTone}`}>
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <h1 className="mt-5 text-4xl">{content.heading}</h1>
        <p className="mt-3 text-brand-text-muted">{content.description}</p>
        {orderId ? (
          <p className="mt-4 inline-flex rounded-full bg-brand-bg-muted px-3 py-1 text-xs font-semibold text-brand-text-muted">
            Bestellnummer: {orderId}
          </p>
        ) : null}
        {sessionId && paymentState !== 'paid' ? (
          <p className="mt-2 text-xs text-brand-text-muted">Transaktionsreferenz: {sessionId}</p>
        ) : null}
        {sessionStatus && paymentState !== 'paid' ? (
          <p className="mt-1 text-xs text-brand-text-muted">
            Zahlung: {sessionStatus.payment_status} · Bestellung: {sessionStatus.order_status}
          </p>
        ) : null}
        {paymentState === 'paid' ? (
          <p className="mt-3 text-sm text-brand-text-muted">Die Bestätigung und alle weiteren Updates gehen an deine E-Mail-Adresse.</p>
        ) : null}
        {paymentState !== 'paid' ? (
          <p className="mt-3 text-sm text-brand-text-muted">Wenn der Status offen bleibt, erreichst du uns unter {PUBLIC_SUPPORT_EMAIL}.</p>
        ) : null}

        {paymentState === 'paid' ? (
          <div className="mt-8 space-y-3 text-left">
            {CHECKOUT_SUCCESS_STEPS.map((step) => (
              <article key={step.title} className="panel-soft flex items-start gap-3 p-4">
                <step.icon className="mt-0.5 h-5 w-5 text-brand-accent" />
                <div>
                  <h2 className="text-base font-semibold text-brand-text">{step.title}</h2>
                  <p className="text-sm text-brand-text-muted">{step.description}</p>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {paymentState === 'paid' ? (
            <Link href="/kundencenter" className="cta-primary inline-flex min-h-[2.75rem] items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm transition-all duration-150">
              Zum Kundencenter
            </Link>
          ) : null}
          {paymentState === 'pending' ? (
            <Button onClick={() => window.location.reload()}>Status aktualisieren</Button>
          ) : null}
          {paymentState === 'failed' ? (
            <Link
              href={`/checkout?cancelled=true${orderId ? `&order_id=${encodeURIComponent(orderId)}` : ''}`}
              className="cta-primary inline-flex min-h-[2.75rem] items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm transition-all duration-150"
            >
              Zahlung erneut starten
            </Link>
          ) : null}
          <Link
            href={paymentState === 'paid' ? '/products' : '/checkout'}
            className="cta-secondary inline-flex min-h-[2.75rem] items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-150"
          >
            {paymentState === 'paid' ? 'Weiter einkaufen' : 'Zurück zum Checkout'}
          </Link>
          <Link
            href="/kontakt"
            onClick={() => {
              void trackEvent('contact_support_clicked', {
                payload: {
                  source: 'checkout_success',
                },
              })
            }}
            className="inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-brand-text transition-all duration-150 hover:bg-black/5"
          >
            <LifeBuoy className="h-4 w-4" />
            <span>Kontakt</span>
          </Link>
        </div>
      </section>
    </main>
  )
}
