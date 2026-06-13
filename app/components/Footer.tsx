// Purpose: Enhanced footer with newsletter, social links, payment methods and legal bar
// Docs: AGENTS.md

'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { NewsletterSignup } from '@/components/newsletter-signup'
import { PaymentMethods } from '@/components/payment-methods'
function SocialIcon({ name }: { name: 'instagram' | 'facebook' | 'youtube' | 'twitter' }) {
  const paths: Record<string, string> = {
    instagram:
      'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z',
    facebook:
      'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
    youtube:
      'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
    twitter:
      'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  }
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  )
}

const SOCIAL_LINKS = [
  { href: '#', label: 'Instagram', icon: 'instagram' as const },
  { href: '#', label: 'Facebook', icon: 'facebook' as const },
  { href: '#', label: 'YouTube', icon: 'youtube' as const },
  { href: '#', label: 'Twitter', icon: 'twitter' as const },
] as const

export function Footer() {
  const t = useTranslations('footer')

  const SHOP_LINKS = [
    { href: '/produkte', label: t('shopAllProducts') },
    { href: '/sale', label: t('shopSale') },
    { href: '/wunschliste', label: t('shopWishlist') },
    { href: '/konto/bestellungen', label: t('shopMyOrders') },
  ]

  const SERVICE_LINKS = [
    { href: '/hilfe/versand', label: t('serviceShipping') },
    { href: '/hilfe/rueckgabe', label: t('serviceReturns') },
    { href: '/hilfe/zahlung', label: t('servicePayment') },
    { href: '/kontakt', label: t('serviceContact') },
    { href: '/bestellung-verfolgen', label: t('serviceTrackOrder') },
  ]

  const LEGAL_LINKS = [
    { href: '/impressum', label: t('legalImprint') },
    { href: '/agb', label: t('legalTerms') },
    { href: '/widerrufsrecht', label: t('legalCancellation') },
    { href: '/datenschutz', label: t('legalPrivacy') },
  ]

  return (
    <footer className="mt-auto border-t border-border bg-muted">
      <div className="container mx-auto grid gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-5">
        {/* Brand + social */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Link href="/" className="text-xl font-bold tracking-tight">
            {t('brandName')}
          </Link>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground text-pretty">
            {t('brandDesc')}
          </p>
          <div className="flex items-center gap-3">
            {SOCIAL_LINKS.map(({ icon, label, href }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <SocialIcon name={icon} />
              </a>
            ))}
          </div>
        </div>

        <nav aria-label={t('shopHeading')}>
          <h3 className="mb-3 text-sm font-semibold">{t('shopHeading')}</h3>
          <ul className="flex flex-col gap-2">
            {SHOP_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={t('serviceHeading')}>
          <h3 className="mb-3 text-sm font-semibold">{t('serviceHeading')}</h3>
          <ul className="flex flex-col gap-2">
            {SERVICE_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">{t('newsletterHeading')}</h3>
          <p className="text-sm text-muted-foreground">{t('newsletterDesc')}</p>
          <NewsletterSignup />
        </div>
      </div>

      <div className="border-t border-border bg-muted/50">
        <div className="container mx-auto flex flex-col gap-6 px-4 py-8 lg:grid lg:grid-cols-3 lg:items-start">
          <nav aria-label={t('legalHeading')}>
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lg:justify-self-center">
            <PaymentMethods />
          </div>

          <p className="text-xs text-muted-foreground lg:justify-self-end">
            {t('copyright', { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  )
}
