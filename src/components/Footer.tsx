'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { NewsletterSignup } from '@/components/newsletter-signup'
import { PaymentMethods } from '@/components/payment-methods'
import {
  STOREFRONT_FOOTER_LEGAL_NOTE,
  STOREFRONT_LEGAL_LINKS,
} from '@/config/storefront-legal'

export function Footer() {
  const t = useTranslations('footer')

  const shopLinks = [
    { href: '/produkte', label: t('shopAllProducts') },
    { href: '/sale', label: t('shopSale') },
    { href: '/wunschliste', label: t('shopWishlist') },
    { href: '/konto/bestellungen', label: t('shopMyOrders') },
  ]
  const serviceLinks = [
    { href: '/hilfe/versand', label: t('serviceShipping') },
    { href: '/hilfe/rueckgabe', label: t('serviceReturns') },
    { href: '/hilfe/zahlung', label: t('servicePayment') },
    { href: '/kontakt', label: t('serviceContact') },
    { href: '/bestellung-verfolgen', label: t('serviceTrackOrder') },
  ]
  const legalLinks = STOREFRONT_LEGAL_LINKS

  return (
    <footer className="mt-auto border-t border-border bg-muted/20">
      <div className="container mx-auto grid gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-[1.35fr_0.8fr_0.8fr_1fr]">
        <div>
          <Link href="/" className="inline-flex min-h-6 items-center text-lg font-semibold tracking-[-0.025em]">
            ShopSIN
          </Link>
          <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
            Ein klarer Onlineshop für ausgewählte Produkte. Produktdaten, Freigaben und
            Verantwortliche werden produktbezogen gepflegt statt pauschal behauptet.
          </p>
          <p className="mt-4 max-w-md text-xs leading-5 text-muted-foreground">
            Hersteller und EU-Verantwortliche stehen, sofern erforderlich, direkt beim jeweiligen Produkt.
          </p>
        </div>

        <FooterLinks heading={t('shopHeading')} links={shopLinks} />
        <FooterLinks heading={t('serviceHeading')} links={serviceLinks} />

        <div>
          <h3 className="text-sm font-semibold">Newsletter</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Neue Produkte und wesentliche Shop-Updates. Kein künstlicher Countdown und keine erfundene Verknappung.
          </p>
          <div className="mt-4">
            <NewsletterSignup />
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="container mx-auto grid gap-5 px-4 py-7 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
          <nav aria-label={t('legalHeading')}>
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="inline-flex min-h-6 items-center text-xs text-muted-foreground hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <PaymentMethods />

          <div className="text-xs text-muted-foreground lg:text-right">
            <p>{STOREFRONT_FOOTER_LEGAL_NOTE}</p>
            <p className="mt-1">{t('copyright', { year: new Date().getFullYear() })}</p>
          </div>
        </div>
      </div>
    </footer>
  )
}

function FooterLinks({
  heading,
  links,
}: {
  heading: string
  links: Array<{ href: string; label: string }>
}) {
  return (
    <nav aria-label={heading}>
      <h3 className="text-sm font-semibold">{heading}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="inline-flex min-h-6 items-center text-sm text-muted-foreground hover:text-foreground">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
