'use client'

import Link from '@/components/ui/Link'
import { PanelLeft, Store } from 'lucide-react'
import type { AdminDomainLink } from '@/features/admin/types'
import { ADMIN_OPERATION_SURFACES, ADMIN_WORKSPACE_LINKS } from '@/features/admin/constants'
import { isActiveHref, sidebarIconWrapClasses, sidebarLinkClasses } from './nav-utils'

type NavSectionProps = {
  title: string
  ariaLabel: string
  items: AdminDomainLink[]
  pathname: string
}

function NavSection({ title, ariaLabel, items, pathname }: NavSectionProps) {
  return (
    <nav className="panel p-4" aria-label={ariaLabel}>
      <p className="section-eyebrow">{title}</p>
      <div className="mt-3 space-y-2">
        {items.map((item) => {
          const active = isActiveHref(pathname, item.href, item.exact)
          const ItemIcon = item.icon || PanelLeft
          return (
            <Link key={item.href} href={item.href} className={sidebarLinkClasses(active)} aria-current={active ? 'page' : undefined}>
              <span className={sidebarIconWrapClasses(active)}>
                <ItemIcon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{item.title}</span>
                <span className={active ? 'mt-1 block text-xs text-white/72' : 'mt-1 block text-xs text-brand-text-muted'}>
                  {item.description}
                </span>
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export function AdminShellSidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-6 space-y-4">
        <section className="panel-elevated overflow-hidden p-4">
          <p className="section-eyebrow">Simone Admin</p>
          <p className="mt-2 text-lg font-semibold text-brand-text">Operations & Control</p>
          <p className="mt-2 text-sm text-brand-text-muted">Workspaces und operative Views in einer Produkt-Schale.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/" className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white">
              <Store className="h-4 w-4" />
              Shop
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-full border border-brand-border bg-white px-4 py-2 text-sm font-semibold text-brand-text transition-colors hover:border-brand-border-strong"
            >
              Sortiment
            </Link>
          </div>
        </section>

        <NavSection title="Workspaces" ariaLabel="Admin Workspaces" items={ADMIN_WORKSPACE_LINKS} pathname={pathname} />
        <NavSection title="Operativ" ariaLabel="Operative Datenflächen" items={ADMIN_OPERATION_SURFACES} pathname={pathname} />
      </div>
    </aside>
  )
}

