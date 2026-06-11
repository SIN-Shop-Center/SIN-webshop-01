// Purpose: Shared legal page layout — renders content from config/storefront-legal
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)

import Link from 'next/link'
import {
  STOREFRONT_FOOTER_LEGAL_NOTE,
  STOREFRONT_LEGAL_LINKS,
  type StorefrontLegalPage,
} from '../../config/storefront-legal'

interface LegalPageProps {
  page: StorefrontLegalPage
}

export function LegalPage({ page }: LegalPageProps) {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-4 text-3xl font-bold text-balance">{page.title}</h1>
      <p className="mb-6 text-muted-foreground text-pretty">{page.description}</p>
      <p className="mb-8 text-pretty">{page.intro}</p>

      {page.sections?.map((section) => (
        <section key={section.title} className="mb-8">
          <h2 className="mb-3 text-xl font-semibold">{section.title}</h2>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-pretty">
            {section.body}
          </pre>
        </section>
      ))}

      <footer className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">
        <p className="mb-3">{STOREFRONT_FOOTER_LEGAL_NOTE}</p>
        <nav className="flex flex-wrap gap-x-4 gap-y-1">
          {STOREFRONT_LEGAL_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="underline hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>
      </footer>
    </div>
  )
}
