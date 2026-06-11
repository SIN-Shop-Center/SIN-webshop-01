// Purpose: Checkout success page (Step 4 of migration)
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'

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

  // Cart serverseitig leeren
  const cookieStore = await cookies()
  const cartId = cookieStore.get('sin_cart_id')?.value
  if (cartId) {
    const supabase = createAdminClient()
    await supabase.from('cart_items').delete().eq('cart_id', cartId)
  }

  return (
    <div className="container mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="mb-4 text-2xl font-bold">Vielen Dank für deine Bestellung</h1>
      <p className="mb-6 text-muted-foreground text-pretty">
        Deine Zahlung war erfolgreich. Du erhältst in Kürze eine
        Bestellbestätigung per E-Mail
        {session.customer_details?.email
          ? ` an ${session.customer_details.email}`
          : ''}
        .
      </p>
      <Link
        href="/"
        className="inline-block rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Weiter einkaufen
      </Link>
    </div>
  )
}
