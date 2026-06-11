// Purpose: 404 page with branded empty state (Step 10)
// Docs: PLAN-VERKAUFSFAEHIG.md

import Link from 'next/link'
import { PackageIcon } from './components/icons'

export default function NotFound() {
  return (
    <div className="container mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-12 text-center">
      <PackageIcon
        className="mb-4 size-12 text-muted-foreground"
        aria-hidden
      />
      <h1 className="mb-2 text-2xl font-bold">Fehler 404</h1>
      <p className="mb-6 text-muted-foreground text-pretty">
        Diese Seite gibt es nicht. Vielleicht wurde sie verschoben oder der Link
        ist veraltet.
      </p>
      <Link href="/" className="btn btn-primary btn-md">
        Zur Startseite
      </Link>
    </div>
  )
}
