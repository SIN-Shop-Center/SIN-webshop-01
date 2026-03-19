'use client'

import { Suspense, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import Link from '@/components/ui/Link'
import { BadgeCheck, LockKeyhole, Truck } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { PUBLIC_SUPPORT_EMAIL } from '@/lib/public-contact'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { FooterLegalLinks } from './FooterLegalLinks'

const CartDrawer = dynamic(
  () => import('@/components/layout/CartDrawer').then((module) => module.CartDrawer),
  { ssr: false },
)

function isCheckoutRoute(pathname: string): boolean {
  return pathname === '/checkout' || pathname.startsWith('/checkout/')
}

function isAdminRoute(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/')
}

function isCustomerRoute(pathname: string): boolean {
  return (
    pathname === '/kundencenter' ||
    (pathname.startsWith('/kundencenter/') && !pathname.startsWith('/kundencenter/login')) ||
    pathname === '/account' ||
    pathname.startsWith('/account/')
  )
}

function isAuthRoute(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname.startsWith('/login/') ||
    pathname === '/forbidden' ||
    pathname === '/admin/login' ||
    pathname === '/kundencenter/login'
  )
}

function isA2ARoute(pathname: string): boolean {
  return pathname === '/a2a' || pathname.startsWith('/a2a/')
}

function linkClasses(active: boolean, dark = false): string {
  return [
    'rounded-full px-4 py-2 text-sm font-medium transition-colors',
    dark
      ? active
        ? 'bg-white text-black'
        : 'text-white/72 hover:bg-white/10 hover:text-white'
      : active
        ? 'bg-black text-white'
        : 'text-brand-text-muted hover:bg-white hover:text-brand-text',
  ].join(' ')
}

function CompactFooter({ copy }: { copy: string }) {
  return (
    <footer className="border-t border-brand-border bg-brand-surface">
      <div className="shell-container flex flex-col gap-3 py-5 text-sm text-brand-text-muted">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p>{copy}</p>
          <p>Kontakt: {PUBLIC_SUPPORT_EMAIL}</p>
        </div>
        <FooterLegalLinks />
      </div>
    </footer>
  )
}

function CheckoutChrome({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="border-b border-brand-border bg-brand-surface/96 backdrop-blur">
        <div className="shell-container flex min-h-[5.25rem] flex-wrap items-center justify-between gap-4 py-4">
          <div>
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-black text-sm font-semibold text-white">
                SS
              </span>
              <span>
                <span className="block text-base font-semibold text-brand-text">Simone Shop</span>
                <span className="block text-xs uppercase tracking-[0.16em] text-brand-text-muted">
                  Fokussierter Checkout
                </span>
              </span>
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-brand-text-muted">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-white px-3 py-1.5">
              <LockKeyhole className="h-3.5 w-3.5 text-brand-text" />
              SSL-gesichert
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-white px-3 py-1.5">
              <Truck className="h-3.5 w-3.5 text-brand-text" />
              Lieferung vorab sichtbar
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-white px-3 py-1.5">
              <BadgeCheck className="h-3.5 w-3.5 text-brand-text" />
              Transparente Kosten
            </span>
          </div>
        </div>
      </header>

      <div id="main-content" tabIndex={-1}>
        {children}
      </div>

      <CompactFooter copy="Adresse, Zahlung und Bestellprüfung ohne unnötige Schleifen." />
    </>
  )
}

function CustomerChrome({ children, pathname }: { children: ReactNode; pathname: string }) {
  const navItems = [
    { label: 'Shop', href: '/' },
    { label: 'Sortiment', href: '/products' },
    { label: 'Kundencenter', href: '/kundencenter' },
    { label: 'Kontakt', href: '/kontakt' },
  ]

  return (
    <>
      <header className="border-b border-brand-border bg-brand-surface/96 backdrop-blur">
        <div className="shell-container flex min-h-[5.25rem] flex-wrap items-center justify-between gap-4 py-4">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-black text-sm font-semibold text-white">
              SS
            </span>
            <span>
              <span className="block text-base font-semibold text-brand-text">Simone Shop</span>
              <span className="block text-xs uppercase tracking-[0.16em] text-brand-text-muted">
                Kundencenter
              </span>
            </span>
          </Link>

          <nav className="flex flex-wrap items-center gap-2" aria-label="Kundencenter Navigation">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className={linkClasses(pathname === item.href)}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <div id="main-content" tabIndex={-1}>
        {children}
      </div>

      <CompactFooter copy="Bestellungen, Profil und Adressen getrennt vom öffentlichen Shopfluss." />
    </>
  )
}

function AuthChrome({ children, pathname }: { children: ReactNode; pathname: string }) {
  const navItems = [
    { label: 'Shop', href: '/' },
    { label: 'Sortiment', href: '/products' },
    { label: 'Kontakt', href: '/kontakt' },
  ]

  return (
    <>
      <header className="border-b border-brand-border bg-brand-surface/96 backdrop-blur">
        <div className="shell-container flex min-h-[5.25rem] flex-wrap items-center justify-between gap-4 py-4">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-black text-sm font-semibold text-white">
              SS
            </span>
            <span>
              <span className="block text-base font-semibold text-brand-text">Simone Shop</span>
              <span className="block text-xs uppercase tracking-[0.16em] text-brand-text-muted">
                Zugang
              </span>
            </span>
          </Link>

          <nav className="flex flex-wrap items-center gap-2" aria-label="Zugang Navigation">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className={linkClasses(pathname === item.href)}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <div id="main-content" tabIndex={-1}>
        {children}
      </div>

      <CompactFooter copy="Anmeldung für Kundencenter und Admincenter ohne Vermischung mit dem Shop-Funnel." />
    </>
  )
}

function A2AChrome({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="border-b border-brand-border bg-brand-surface/96 backdrop-blur">
        <div className="shell-container flex min-h-[5.25rem] flex-wrap items-center justify-between gap-4 py-4">
          <Link href="/a2a" className="inline-flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-black text-sm font-semibold text-white">
              A2
            </span>
            <span>
              <span className="block text-base font-semibold text-brand-text">SIN Workforce</span>
              <span className="block text-xs uppercase tracking-[0.16em] text-brand-text-muted">A2A Directory</span>
            </span>
          </Link>

          <nav className="flex flex-wrap items-center gap-2" aria-label="A2A Navigation">
            <Link href="/a2a" className={linkClasses(true)}>
              Agents
            </Link>
            <Link href="/" className={linkClasses(false)}>
              Zum Shop
            </Link>
          </nav>
        </div>
      </header>

      <div id="main-content" tabIndex={-1}>
        {children}
      </div>
    </>
  )
}

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/'
  const checkoutRoute = isCheckoutRoute(pathname)
  const adminRoute = isAdminRoute(pathname)
  const customerRoute = isCustomerRoute(pathname)
  const authRoute = isAuthRoute(pathname)
  const a2aRoute = isA2ARoute(pathname)

  if (checkoutRoute) {
    return <CheckoutChrome>{children}</CheckoutChrome>
  }

  if (adminRoute) {
    return <>{children}</>
  }

  if (a2aRoute) {
    return <A2AChrome>{children}</A2AChrome>
  }

  if (customerRoute) {
    return <CustomerChrome pathname={pathname}>{children}</CustomerChrome>
  }

  if (authRoute) {
    return <AuthChrome pathname={pathname}>{children}</AuthChrome>
  }

  return (
    <>
      <Suspense fallback={<div className="h-[5.75rem] border-b border-brand-border bg-brand-surface" />}>
        <Navbar />
      </Suspense>
      <div id="main-content" tabIndex={-1}>
        {children}
      </div>
      <Footer />
      <CartDrawer />
    </>
  )
}
