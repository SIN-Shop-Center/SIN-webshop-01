import Link from 'next/link'

export const metadata = {
  title: 'Newsletter bestätigen — ShopSIN',
  robots: { index: false, follow: false },
}

export default async function NewsletterConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const confirmed = status === 'confirmed'

  return (
    <main className="container mx-auto flex min-h-[55vh] max-w-lg flex-col items-center justify-center px-4 py-12 text-center">
      <h1 className="text-3xl font-bold tracking-tight">
        {confirmed ? 'Anmeldung bestätigt' : 'Link nicht mehr gültig'}
      </h1>
      <p className="mt-4 text-pretty text-muted-foreground">
        {confirmed
          ? 'Deine Newsletter-Anmeldung ist jetzt abgeschlossen. Du erhältst nur Nachrichten, solange du angemeldet bleibst.'
          : 'Der Bestätigungslink ist ungültig oder abgelaufen. Du kannst dich erneut anmelden und einen neuen Link anfordern.'}
      </p>
      <Link href="/" className="btn btn-primary btn-md mt-8">
        Zur Startseite
      </Link>
    </main>
  )
}
