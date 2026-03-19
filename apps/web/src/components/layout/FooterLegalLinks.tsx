import Link from '@/components/ui/Link'

const LEGAL_LINKS = [
  { label: 'Impressum', href: '/impressum' },
  { label: 'Datenschutz', href: '/datenschutz' },
  { label: 'AGB', href: '/agb' },
  { label: 'Widerruf', href: '/widerrufsrecht' },
] as const

type FooterLegalLinksProps = {
  className?: string
  linkClassName?: string
}

function joinClasses(...values: Array<string | undefined>): string {
  return values.filter(Boolean).join(' ')
}

export function FooterLegalLinks({ className, linkClassName }: FooterLegalLinksProps) {
  return (
    <nav
      aria-label="Rechtliche Links"
      className={joinClasses('flex flex-wrap items-center gap-x-4 gap-y-2', className)}
    >
      {LEGAL_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          prefetch={false}
          className={joinClasses('text-sm text-brand-text-muted transition-colors hover:text-brand-text', linkClassName)}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  )
}
