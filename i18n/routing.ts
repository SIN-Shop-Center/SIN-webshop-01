import {defineRouting} from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['de', 'en'],
  defaultLocale: 'de',
  pathnames: {
    '/': '/',
    '/produkte': {
      en: '/products',
    },
    '/produkt/[id]': {
      en: '/product/[id]',
    },
    '/sale': '/sale',
    '/warenkorb': {
      en: '/cart',
    },
    '/kasse': {
      en: '/checkout',
    },
    '/suche': {
      en: '/search',
    },
    '/kontakt': {
      en: '/contact',
    },
    '/wunschliste': {
      en: '/wishlist',
    },
    '/impressum': {
      en: '/legal-notice',
    },
    '/agb': {
      en: '/terms',
    },
    '/widerrufsrecht': {
      en: '/cancellation-policy',
    },
    '/datenschutz': {
      en: '/privacy',
    },
    '/hilfe/versand': {
      en: '/help/shipping',
    },
    '/hilfe/rueckgabe': {
      en: '/help/returns',
    },
    '/hilfe/zahlung': {
      en: '/help/payment',
    },
    '/bestellung-verfolgen': {
      en: '/track-order',
    },
    '/konto': {
      en: '/account',
    },
  },
})
