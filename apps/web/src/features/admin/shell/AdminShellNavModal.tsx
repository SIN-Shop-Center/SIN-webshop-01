'use client'

import Link from '@/components/ui/Link'
import { PanelLeft } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import type { AdminDomainLink } from '@/features/admin/types'
import { ADMIN_OPERATION_SURFACES, ADMIN_WORKSPACE_LINKS } from '@/features/admin/constants'
import { isActiveHref, sidebarIconWrapClasses, sidebarLinkClasses } from './nav-utils'

type NavModalSectionProps = {
  title: string
  items: AdminDomainLink[]
  pathname: string
  onNavigate: () => void
}

function NavModalSection({ title, items, pathname, onNavigate }: NavModalSectionProps) {
  return (
    <section>
      <p className="section-eyebrow">{title}</p>
      <div className="mt-3 space-y-2">
        {items.map((item) => {
          const active = isActiveHref(pathname, item.href, item.exact)
          const ItemIcon = item.icon || PanelLeft
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={sidebarLinkClasses(active)}
              aria-current={active ? 'page' : undefined}
            >
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
    </section>
  )
}

export function AdminShellNavModal({
  pathname,
  isOpen,
  onClose,
}: {
  pathname: string
  isOpen: boolean
  onClose: () => void
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Admin Navigation"
      size="md"
      className="border-brand-border bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(243,240,234,0.88))]"
    >
      <div className="space-y-5">
        <NavModalSection title="Workspaces" items={ADMIN_WORKSPACE_LINKS} pathname={pathname} onNavigate={onClose} />
        <NavModalSection title="Operativ" items={ADMIN_OPERATION_SURFACES} pathname={pathname} onNavigate={onClose} />
      </div>
    </Modal>
  )
}

