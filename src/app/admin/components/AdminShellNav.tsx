'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Activity,
  BadgeCheck,
  Boxes,
  ClipboardList,
  ExternalLink,
  Film,
  LayoutDashboard,
  PackageSearch,
  RefreshCcw,
  RotateCcw,
  ScrollText,
  ShoppingBag,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

type AdminNavItem = {
  href: string
  label: string
  icon: LucideIcon
}

type AdminNavGroup = {
  label: string
  items: AdminNavItem[]
}

const NAV_GROUPS: AdminNavGroup[] = [
  {
    label: 'Control',
    items: [
      { href: '/admin', label: 'Übersicht', icon: LayoutDashboard },
      { href: '/admin/automatisierungen', label: 'Automatisierungen', icon: RefreshCcw },
      { href: '/admin/creative', label: 'Creative Studio', icon: Film },
      { href: '/admin/freigaben', label: 'Freigaben', icon: BadgeCheck },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { href: '/admin/produkte', label: 'Produkte', icon: PackageSearch },
      { href: '/admin/bestellungen', label: 'Bestellungen', icon: ClipboardList },
      { href: '/admin/fulfillment', label: 'Fulfillment', icon: Boxes },
      { href: '/admin/ruecksendungen', label: 'Rücksendungen', icon: RotateCcw },
      { href: '/admin/tiktok', label: 'TikTok Shop', icon: ShoppingBag },
    ],
  },
  {
    label: 'System',
    items: [{ href: '/admin/audit', label: 'Audit-Log', icon: ScrollText }],
  },
]

function NavLink({
  href,
  label,
  icon: Icon,
  compact = false,
}: {
  href: string
  label: string
  icon: LucideIcon
  compact?: boolean
}) {
  const pathname = usePathname()
  const active = href === '/admin' ? pathname === href : pathname.startsWith(href)

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={[
        'group flex items-center gap-3 rounded-lg text-sm font-medium transition-colors',
        compact ? 'px-3 py-2' : 'px-3 py-2.5',
        active
          ? 'bg-foreground text-background shadow-sm'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      ].join(' ')}
    >
      <Icon className="size-4 shrink-0" strokeWidth={1.8} aria-hidden />
      <span>{label}</span>
    </Link>
  )
}

export function AdminShellNav() {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-background lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-3 border-b border-border px-5">
          <div className="grid size-8 place-items-center rounded-lg bg-foreground text-background">
            <Sparkles className="size-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">ShopSIN OS</p>
            <p className="truncate text-xs text-muted-foreground">Commerce Control Plane</p>
          </div>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Admin-Navigation">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink key={item.href} {...item} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-40" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            <span className="text-xs font-medium">Control Plane online</span>
          </div>
          <Link
            href="/"
            className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <span>Shop öffnen</span>
            <ExternalLink className="size-3.5" aria-hidden />
          </Link>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/admin" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid size-7 place-items-center rounded-md bg-foreground text-background">
              <Sparkles className="size-3.5" aria-hidden />
            </span>
            ShopSIN OS
          </Link>
          <Link href="/" aria-label="Shop öffnen" className="rounded-md p-2 hover:bg-muted">
            <ExternalLink className="size-4" aria-hidden />
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3" aria-label="Mobile Admin-Navigation">
          {NAV_GROUPS.flatMap((group) => group.items).map((item) => (
            <NavLink key={item.href} {...item} compact />
          ))}
        </nav>
      </header>
    </>
  )
}
