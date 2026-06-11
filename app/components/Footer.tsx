// Purpose: Footer component for Next.js storefront (Step 1)
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)

import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted py-12">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <h3 className="mb-4 text-sm font-semibold">Rechtliches</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/impressum">Impressum</Link></li>
              <li><Link href="/datenschutz">Datenschutz</Link></li>
              <li><Link href="/agb">AGB</Link></li>
              <li><Link href="/versand">Versand</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-semibold">Kategorien</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/?category=Tech">Tech &amp; Gadgets</Link></li>
              <li><Link href="/?category=Fashion">Fashion</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-border pt-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} SIN Shop Center. Alle Rechte vorbehalten.
        </div>
      </div>
    </footer>
  )
}
