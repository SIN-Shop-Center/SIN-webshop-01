export type NavItem = {
  label: string
  href: string
  segment?: 'b2b' | 'b2c'
  query?: Record<string, string>
  className?: string
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Angebote', href: '/products', query: { badge: 'sale' } },
  { label: 'Elektronik', href: '/products', query: { category: 'cat-1' } },
  { label: 'Mode', href: '/products', query: { category: 'cat-2' } },
  { label: 'Haus & Garten', href: '/products', query: { category: 'cat-3' } },
  { label: 'Sport & Freizeit', href: '/products', query: { category: 'cat-4' } },
  { label: 'Beauty & Gesundheit', href: '/products', query: { category: 'cat-5' } },
  { label: 'Spielzeug', href: '/products', query: { category: 'cat-6' } },
  { label: 'Bestseller', href: '/products', query: { badge: 'bestseller' }, className: 'hidden lg:inline-flex' },
  { label: 'Neu', href: '/products', query: { badge: 'new' }, className: 'hidden lg:inline-flex' },
]

export const MOBILE_NAV_ITEMS: NavItem[] = [
  { label: 'Angebote', href: '/products', query: { badge: 'sale' } },
  { label: 'Elektronik', href: '/products', query: { category: 'cat-1' } },
  { label: 'Mode', href: '/products', query: { category: 'cat-2' } },
  { label: 'Haus & Garten', href: '/products', query: { category: 'cat-3' } },
  { label: 'Sport & Freizeit', href: '/products', query: { category: 'cat-4' } },
  { label: 'Beauty & Gesundheit', href: '/products', query: { category: 'cat-5' } },
  { label: 'Spielzeug', href: '/products', query: { category: 'cat-6' } },
  { label: 'Bestseller', href: '/products', query: { badge: 'bestseller' } },
  { label: 'Neu', href: '/products', query: { badge: 'new' } },
  { label: 'Firmenkauf', href: '/products', segment: 'b2b' },
  { label: 'Rückgabe', href: '/rueckgabe' },
  { label: 'Versand', href: '/versand' },
  { label: 'Warenkorb', href: '/cart' },
  { label: 'Kundencenter', href: '/kundencenter' },
  { label: 'Kontakt', href: '/kontakt' },
  { label: 'FAQ', href: '/faq' },
]

