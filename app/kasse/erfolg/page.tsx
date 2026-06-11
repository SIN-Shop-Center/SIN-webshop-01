// Purpose: Checkout success page with CheckIcon (Step 4 + Step 10)
// Docs: PLAN-VERKAUFSFAEHIG.md
//
// Cart-Clearing passiert jetzt serverseitig im Stripe-Webhook
// (checkout.session.completed → cart_id aus session.metadata).
// Diese Seite rendert nur noch den Erfolg — kein Seiteneffekt.

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getStripe } from '@/lib/stripe'
import { CheckIcon, PackageIcon, ArrowRightIcon } from '@/components/icons'

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams
  if (!session_id) redirect('/')

  // Session bei Stripe verifizieren — nicht blind dem Query-Param vertrauen
  const session = await getStripe().checkout.sessions.retrieve(session_id)
  if (session.payment_status !== 'paid') redirect('/warenkorb')

  const email = session.customer_details?.email

  return (
    <div className="container mx-auto max-w-md px-4 py-16 text-center">
      <div className="mx-auto mb-6 inline-flex size-16 items-center justify-center rounded-full bg-success/10">
        <CheckIcon className="size-8 text-success" aria-hidden />
      </div>
      <h1 className="mb-3 text-3xl font-bold tracking-tight">
        Vielen Dank für deine Bestellung!
      </h1>
      <p className="mb-8 text-pretty text-muted-foreground">
        Deine Zahlung war erfolgreich. Du erhältst in Kürze eine
        Bestellbestätigung per E-Mail
        {email ? <> an <strong>{email}</strong></> : null}.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/" className="btn btn-primary btn-md">
          Weiter einkaufen
          <ArrowRightIcon className="size-4" aria-hidden />
        </Link>
        <Link href="/konto/bestellungen" className="btn btn-outline btn-md">
          <PackageIcon className="size-4" aria-hidden />
          Meine Bestellungen
        </Link>
      </div>
    </div>
  )
}
