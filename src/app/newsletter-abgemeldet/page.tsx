import Link from 'next/link'

export const metadata = {
  title: 'Newsletter abgemeldet — ShopSIN',
  robots: { index: false, follow: false },
}

export default function NewsletterUnsubscribedPage() {
  return (
    <main className="container mx-auto flex min-h-[55vh] max-w-lg flex-col items-center justify-center px-4 py-12 text-center">
      <h1 className="text-3xl font-bold tracking-tight">Newsletter abgemeldet</h1>
      <p className="mt-4 text-pretty text-muted-foreground">
        Die Abmeldung wurde verarbeitet. Über diesen Newsletter erhältst du keine weiteren Marketingnachrichten.
      </p>
      <Link href="/" className="btn btn-primary btn-md mt-8">
        Zur Startseite
      </Link>
    </main>
  )
}
