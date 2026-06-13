'use client'

import Link from 'next/link'
import {useTranslations} from 'next-intl'
import {NewsletterSignup} from '@/components/newsletter-signup'
import {PaymentMethods} from '@/components/payment-methods'

export function Footer() {
  const t = useTranslations('footer')

  const SHOP_LINKS = [
    {href: '/produkte', label: t('shopAllProducts')},
    {href: '/sale', label: t('shopSale')},
    {href: '/wunschliste', label: t('shopWishlist')},
    {href: '/konto/bestellungen', label: t('shopMyOrders')},
  ]

  const SERVICE_LINKS = [
    {href: '/hilfe/versand', label: t('serviceShipping')},
    {href: '/hilfe/rueckgabe', label: t('serviceReturns')},
    {href: '/hilfe/zahlung', label: t('servicePayment')},
    {href: '/kontakt', label: t('serviceContact')},
    {href: '/bestellung-verfolgen', label: t('serviceTrackOrder')},
  ]

  const LEGAL_LINKS = [
    {href: '/impressum', label: t('legalImprint')},
    {href: '/agb', label: t('legalTerms')},
    {href: '/widerrufsrecht', label: t('legalCancellation')},
    {href: '/datenschutz', label: t('legalPrivacy')},
  ]

  return (
    <footer className="mt-auto border-t border-border bg-muted">
      <div className="container mx-auto grid gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-3">
          <h3 className="text-base font-bold">{t('brandName')}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
            {t('brandDesc')}
          </p>
        </div>

        <nav aria-label={t('shopHeading')}>
          <h3 className="mb-3 text-sm font-semibold">{t('shopHeading')}</h3>
          <ul className="flex flex-col gap-2">
            {SHOP_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  className="text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">{t('newsletterHeading')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('newsletterDesc')}
          </p>
          <NewsletterSignup />
        </div>
      </div>

      <div className="border-t border-border">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-5 sm:flex-row">
          <nav aria-label={t('legalHeading')}>
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <PaymentMethods />
          <p className="text-xs text-muted-foreground">
            {t('copyright', {year: new Date().getFullYear()})}
          </p>
        </div>
      </div>
    </footer>
  )
}
