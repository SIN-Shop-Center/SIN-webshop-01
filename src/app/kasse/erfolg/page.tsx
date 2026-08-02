// Purpose: Verified Stripe checkout success page with cart-session binding.

import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { ArrowRightIcon, CheckIcon, PackageIcon } from '@/components/icons'
import { getStripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Bestellung erfolgreich — ShopSIN',
  robots: { index: false, follow: false },
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return 'deine E-Mail-Adresse'
  const visible = local.slice(0, Math.min(2, local.length))
  return `${visible}${'*'.repeat(Math.max(3, local.length - visible.length))}@${domain}`
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id: sessionId } = await searchParams
  if (!sessionId || !sessionId.startsWith('cs_') || sessionId.length > 255) {
    redirect('/warenkorb')
  }

  let session
  try {
    session = await getStripe().checkout.sessions.retrieve(sessionId)
  } catch (error) {
    console.error('[checkout-success] Stripe session lookup failed:', error)
    redirect('/warenkorb')
  }

  if (session.payment_status !== 'paid') redirect('/warenkorb')

  // The session ID alone must not disclose order/customer details. Bind the
  // immediate success view to the same httpOnly cart cookie used at checkout.
  const cookieStore = await cookies()
  const cartId = cookieStore.get('sin_cart_id')?.value ?? ''
  if (!cartId || !session.metadata?.cart_id || session.metadata.cart_id !== cartId) {
    redirect('/bestellung-verfolgen')
  }

  const email = session.customer_details?.email ?? session.customer_email

  return (
    <div className="container mx-auto max-w-md px-4 py-16 text-center">
      <div className="mx-auto mb-6 inline-flex size-16 items-center justify-center rounded-full bg-success/10">
        <CheckIcon className="size-8 text-success" aria-hidden />
      </div>
      <h1 className="mb-3 text-3xl font-bold tracking-tight">
        Vielen Dank für deine Bestellung!
      </h1>
      <p className="mb-8 text-pretty text-muted-foreground">
        Deine Zahlung wurde bestätigt. Die Bestellbestätigung wird
        {email ? <> an <strong>{maskEmail(email)}</strong> gesendet</> : ' per E-Mail gesendet'}.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/produkte" className="btn btn-primary btn-md">
          Weiter einkaufen
          <ArrowRightIcon className="size-4" aria-hidden />
        </Link>
        <Link href="/bestellung-verfolgen" className="btn btn-outline btn-md">
          <PackageIcon className="size-4" aria-hidden />
          Bestellung verfolgen
        </Link>
      </div>
    </div>
  )
}
