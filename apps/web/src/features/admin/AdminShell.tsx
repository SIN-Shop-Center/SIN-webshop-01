'use client'

import { type ReactNode, useMemo, useState } from 'react'
import Link from '@/components/ui/Link'
import { ChevronRight, Layers3, Menu, Store } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { ADMIN_FOOTER_LINKS, ADMIN_WORKSPACE_LINKS, resolveAdminContext } from './constants'
import { AdminShellNavModal } from './shell/AdminShellNavModal'
import { AdminShellSidebar } from './shell/AdminShellSidebar'
import { isActiveHref, pillLinkClasses } from './shell/nav-utils'

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/admin'
  const context = resolveAdminContext(pathname)
  const [navOpen, setNavOpen] = useState(false)
  const ContextIcon = useMemo(() => context.icon || Layers3, [context.icon])

  return (
    <div
      id="main-content"
      tabIndex={-1}
      className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.9),transparent_22%),linear-gradient(180deg,#ebe5da_0%,#f5f2eb_24%,#f7f4ed_100%)]"
    >
      <div className="shell-container py-5">
        <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <AdminShellSidebar pathname={pathname} />

          <div className="min-w-0">
            <header className="panel-elevated overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="hidden rounded-2xl bg-black p-2.5 text-white shadow-lg sm:inline-flex">
                    <ContextIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1 text-sm text-brand-text-muted">
                      <Link href="/admin" className="font-semibold text-brand-text hover:text-brand-accent">
                        Admin
                      </Link>
                      <ChevronRight className="h-4 w-4" />
                      <span className="truncate">{context.title}</span>
                    </div>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand-text-muted">
                      {context.section === 'operations' ? 'Operative Datenfläche' : 'Workspace'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setNavOpen(true)}
                    className="inline-flex items-center gap-2 rounded-full border border-brand-border bg-white px-3 py-2 text-sm font-semibold text-brand-text transition-colors hover:border-brand-border-strong lg:hidden"
                    aria-label="Admin Navigation öffnen"
                  >
                    <Menu className="h-4 w-4" />
                    Menü
                  </button>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-accent-strong"
                  >
                    <Store className="h-4 w-4" />
                    Shop
                  </Link>
                  <Link
                    href="/products"
                    className="hidden items-center gap-2 rounded-full border border-brand-border bg-white px-4 py-2 text-sm font-semibold text-brand-text transition-colors hover:border-brand-border-strong sm:inline-flex"
                  >
                    Sortiment
                  </Link>
                </div>
              </div>
            </header>

            <div className="mt-4 lg:hidden">
              <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
                {ADMIN_WORKSPACE_LINKS.map((item) => {
                  const active = isActiveHref(pathname, item.href, item.exact)
                  return (
                    <Link key={item.href} href={item.href} className={pillLinkClasses(active)} aria-current={active ? 'page' : undefined}>
                      {item.shortLabel || item.title}
                    </Link>
                  )
                })}
              </div>
            </div>

            <div className="mt-6">{children}</div>

            <footer className="mt-8 border-t border-brand-border/80 px-1 pt-5">
              <div className="flex flex-wrap items-center gap-2 text-sm text-brand-text-muted">
                {ADMIN_FOOTER_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="inline-flex items-center gap-2 rounded-full border border-brand-border bg-white px-3 py-2 transition-colors hover:border-brand-border-strong hover:text-brand-text"
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            </footer>
          </div>
        </div>
      </div>

      <AdminShellNavModal pathname={pathname} isOpen={navOpen} onClose={() => setNavOpen(false)} />
    </div>
  )
}
