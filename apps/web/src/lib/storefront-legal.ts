import {
  STOREFRONT_LEGAL_CONTACT as sharedContact,
  STOREFRONT_FOOTER_LEGAL_NOTE as sharedFooterLegalNote,
  STOREFRONT_LEGAL_LINKS as sharedLinks,
  STOREFRONT_LEGAL_PAGES as sharedPages,
} from '../../../../config/storefront-legal.mjs'

export type StorefrontLegalLink = {
  label: string
  href: string
}

export type StorefrontLegalSection = {
  title: string
  body: string
}

export type StorefrontLegalPage = {
  path: string
  title: string
  description: string
  intro: string
  sections?: StorefrontLegalSection[]
}

export type StorefrontLegalPages = {
  impressum: StorefrontLegalPage
  datenschutz: StorefrontLegalPage
  agb: StorefrontLegalPage
  widerrufsrecht: StorefrontLegalPage
}

export const STOREFRONT_LEGAL_CONTACT = sharedContact as {
  ownerName: string
  address: string
  legalEmail: string
  legalPhone: string
}

export const STOREFRONT_FOOTER_LEGAL_NOTE = sharedFooterLegalNote as string

export const STOREFRONT_LEGAL_LINKS = sharedLinks as StorefrontLegalLink[]

export const STOREFRONT_LEGAL_PAGES = sharedPages as StorefrontLegalPages
