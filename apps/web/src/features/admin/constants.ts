import {
  Activity,
  BarChart3,
  Briefcase,
  CircleDollarSign,
  Clock3,
  LayoutDashboard,
  LifeBuoy,
  PackageSearch,
  RadioTower,
  ShieldAlert,
  Sparkles,
  Truck,
  UsersRound,
} from 'lucide-react'
import type { AdminDomainLink } from './types'

export const ADMIN_WORKSPACE_LINKS: AdminDomainLink[] = [
  {
    title: 'Operations Hub',
    href: '/admin',
    description: 'Tägliche Steuerung über die wichtigsten Admin-Arbeitsmodi.',
    shortLabel: 'Hub',
    icon: LayoutDashboard,
    section: 'workspace',
    exact: true,
  },
  {
    title: 'Analytics',
    href: '/admin/analytics',
    description: 'Funnel, Alerts und KPI-Regressionen in einem fokussierten War-Room.',
    shortLabel: 'Analytics',
    icon: BarChart3,
    section: 'workspace',
    exact: true,
  },
  {
    title: 'Channels',
    href: '/admin/channels',
    description: 'TikTok Shop Verbindung, Syncs und Community-Aufgaben ohne Overload.',
    shortLabel: 'Channels',
    icon: RadioTower,
    section: 'workspace',
    exact: true,
  },
  {
    title: 'Suppliers',
    href: '/admin/suppliers',
    description: 'Lieferanten-Onboarding, Kataloge und operative Qualität an einem Ort.',
    shortLabel: 'Suppliers',
    icon: Truck,
    section: 'workspace',
    exact: false,
  },
  {
    title: 'CRM',
    href: '/admin/crm',
    description: 'Tasks, Aktivitäten und Notes für Kunden-, Support- und Supplier-Prozesse.',
    shortLabel: 'CRM',
    icon: Briefcase,
    section: 'workspace',
    exact: true,
  },
  {
    title: 'Generator',
    href: '/admin/generator',
    description: 'UGC-Produktion mit klarer Auswahl, Status und Queue statt Tool-Overkill.',
    shortLabel: 'Generator',
    icon: Sparkles,
    section: 'workspace',
    exact: true,
  },
  {
    title: 'CSM SLA',
    href: '/admin/csm/sla',
    description: 'Offene Cases, Breaches und Reaktionszeiten sauber priorisiert.',
    shortLabel: 'SLA',
    icon: Clock3,
    section: 'workspace',
    exact: false,
  },
]

export const ADMIN_OPERATION_SURFACES: AdminDomainLink[] = [
  {
    title: 'Bestellungen',
    href: '/admin/orders',
    description: 'Operative Order-Liste und Fulfillment-Status.',
    shortLabel: 'Orders',
    icon: PackageSearch,
    section: 'operations',
    exact: true,
  },
  {
    title: 'Produkte',
    href: '/admin/products',
    description: 'Produkte, Preise und Aktivitätsstatus als schnelle Datenfläche.',
    shortLabel: 'Products',
    icon: PackageSearch,
    section: 'operations',
    exact: true,
  },
  {
    title: 'Kunden',
    href: '/admin/customers',
    description: 'Kundenbasis, Bestellmuster und Support-Kontext.',
    shortLabel: 'Customers',
    icon: UsersRound,
    section: 'operations',
    exact: true,
  },
  {
    title: 'Support',
    href: '/admin/support',
    description: 'Tickets und Eskalationen als schnelle Operativ-Ansicht.',
    shortLabel: 'Support',
    icon: LifeBuoy,
    section: 'operations',
    exact: true,
  },
  {
    title: 'Revenue',
    href: '/admin/revenue',
    description: 'Forecast, Attribution und Umsatzsignale als tabellarische Fläche.',
    shortLabel: 'Revenue',
    icon: CircleDollarSign,
    section: 'operations',
    exact: true,
  },
  {
    title: 'Automation',
    href: '/admin/automation',
    description: 'Autopilot-Health, Kill-Switch und Channel-Zustände.',
    shortLabel: 'Automation',
    icon: ShieldAlert,
    section: 'operations',
    exact: true,
  },
]

export const ADMIN_DOMAINS: AdminDomainLink[] = [...ADMIN_WORKSPACE_LINKS, ...ADMIN_OPERATION_SURFACES]

export const ADMIN_FOOTER_LINKS = [
  { title: 'Shop ansehen', href: '/' },
  { title: 'Zur Produktliste', href: '/products' },
  { title: 'Admin Login', href: '/admin/login' },
]

export function resolveAdminContext(pathname: string): AdminDomainLink {
  const match = ADMIN_DOMAINS.find((item) => {
    if (item.exact === false) {
      return pathname === item.href || pathname.startsWith(`${item.href}/`)
    }
    return pathname === item.href
  })

  if (match) {
    return match
  }

  return {
    title: 'Admin',
    href: '/admin',
    description: 'Operativer Arbeitsbereich für Simone Shop.',
    shortLabel: 'Admin',
    icon: LayoutDashboard,
    section: 'workspace',
    exact: true,
  }
}
