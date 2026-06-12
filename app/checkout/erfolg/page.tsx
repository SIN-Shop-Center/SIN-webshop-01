// Purpose: Checkout success page (lightweight, no Stripe verification)
// Docs: PLAN-VERKAUFSFAEHIG.md

import Link from 'next/link'
import { CheckIcon, PackageIcon, ArrowRightIcon } from '@/components/icons'

export const metadata = {
  title: 'Bestellung erfolgreich — ShopSIN',
  robots: { index: false },
}

export default async function CheckoutErfolgPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams

  return (
    <div className="container mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-primary/10">
        <CheckIcon className="size-6 text-primary" aria-hidden />
      </div>
      <h1 className="mb-2 text-2xl font-bold">Vielen Dank für deine Bestellung!</h1>
      <p className="mb-2 text-pretty text-muted-foreground">
        Deine Zahlung war erfolgreich. Du erhältst in Kürze eine Bestellbestätigung per E-Mail.
      </p>
      {session_id && (
        <p className="mb-6 text-xs text-muted-foreground">Referenz: {session_id.slice(0, 24)}…</p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/konto/bestellungen" className="btn btn-primary btn-md">
          <PackageIcon className="size-4" aria-hidden />
          Meine Bestellungen
        </Link>
        <Link href="/produkte" className="btn btn-outline btn-md">
          Weiter einkaufen
          <ArrowRightIcon className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  )
}
