// Purpose: Shared legal-page layout — renders content from config/storefront-legal
// Docs: PLAN-VERKAUFSFAEHIG.md

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
      <h1 className="mb-3 text-3xl font-bold tracking-tight text-balance md:text-4xl">
        {page.title}
      </h1>
      <p className="mb-6 text-muted-foreground text-pretty">{page.description}</p>
      <p className="mb-8 text-pretty">{page.intro}</p>

      {page.disclaimer && (
        <div className="mb-8 rounded-lg border-2 border-amber-400 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">⚠️ Vorlage — kein rechtsverbindliches Dokument</p>
          <p className="mt-1">{page.disclaimer}</p>
        </div>
      )}

      {page.sections?.map((section) => (
        <section key={section.title} className="mb-8">
          <h2 className="mb-3 text-xl font-semibold">{section.title}</h2>
          <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-pretty">
            {section.body}
          </p>
        </section>
      ))}

      <footer className="mt-12 rounded-lg border border-border bg-muted p-6 text-sm">
        <p className="mb-3 text-muted-foreground">
          {STOREFRONT_FOOTER_LEGAL_NOTE}
        </p>
        <nav aria-label="Rechtliche Hinweise" className="flex flex-wrap gap-x-4 gap-y-1">
          {STOREFRONT_LEGAL_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="underline hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </footer>
    </div>
  )
}
