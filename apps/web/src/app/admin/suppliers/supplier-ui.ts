'use client'

import { cn } from '@/lib/utils'

export type SupplierLike = {
  status?: string | null
  onboarding_status?: string | null
  compliance_state?: string | null
  auto_fulfill_enabled?: boolean | null
  registration_url?: string | null
  portal_url?: string | null
  website?: string | null
  api_endpoint?: string | null
  contact_email?: string | null
  email?: string | null
  fulfillment_mode?: string | null
}

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

const toneStyles: Record<StatusTone, string> = {
  neutral: 'border-brand-border bg-white text-brand-text',
  info: 'border-sky-200 bg-sky-50 text-sky-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  danger: 'border-red-200 bg-red-50 text-red-700',
}

export function statusBadgeClass(tone: StatusTone) {
  return cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold', toneStyles[tone])
}

export function statusDotClass(tone: StatusTone) {
  return cn(
    'inline-block h-2.5 w-2.5 rounded-full',
    tone === 'success' && 'bg-emerald-500',
    tone === 'warning' && 'bg-amber-500',
    tone === 'danger' && 'bg-red-500',
    tone === 'info' && 'bg-sky-500',
    tone === 'neutral' && 'bg-zinc-400',
  )
}

export function formatStatusLabel(value?: string | null) {
  const normalized = (value || '').trim()
  if (!normalized) return 'Unbekannt'

  return normalized
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function onboardingTone(status?: string | null): StatusTone {
  switch ((status || '').trim()) {
    case 'connected':
      return 'success'
    case 'awaiting_access':
      return 'warning'
    case 'applied':
    case 'shortlisted':
      return 'info'
    case 'rejected':
      return 'danger'
    default:
      return 'neutral'
  }
}

export function complianceTone(status?: string | null): StatusTone {
  switch ((status || '').trim()) {
    case 'approved':
      return 'success'
    case 'pending':
      return 'warning'
    case 'blocked':
    case 'rejected':
      return 'danger'
    default:
      return 'neutral'
  }
}

export function supplierStatusTone(status?: string | null): StatusTone {
  switch ((status || '').trim()) {
    case 'active':
    case 'approved':
      return 'success'
    case 'pending':
      return 'warning'
    case 'disabled':
    case 'blocked':
    case 'rejected':
      return 'danger'
    default:
      return 'neutral'
  }
}

export function hasRegistrationTarget(supplier: SupplierLike) {
  return Boolean(
    (supplier.registration_url || '').trim() ||
      (supplier.portal_url || '').trim() ||
      (supplier.website || '').trim() ||
      (supplier.api_endpoint || '').trim(),
  )
}

export function hasFulfillmentChannel(supplier: SupplierLike) {
  const fulfillmentMode = (supplier.fulfillment_mode || 'email').trim().toLowerCase()
  if (fulfillmentMode === 'api') {
    return Boolean((supplier.api_endpoint || '').trim())
  }
  return Boolean((supplier.contact_email || '').trim() || (supplier.email || '').trim() || (supplier.api_endpoint || '').trim())
}

export function canStartRegistration(supplier: SupplierLike) {
  const onboardingStatus = (supplier.onboarding_status || '').trim()
  if (onboardingStatus === 'connected' || onboardingStatus === 'awaiting_access') {
    return false
  }
  return hasRegistrationTarget(supplier)
}

export function getNextSupplierAction(supplier: SupplierLike, mappingCount = 0) {
  const onboardingStatus = (supplier.onboarding_status || '').trim()
  const status = (supplier.status || '').trim()
  const compliance = (supplier.compliance_state || '').trim()
  const autoFulfillEnabled = Boolean(supplier.auto_fulfill_enabled)
  const channelReady = hasFulfillmentChannel(supplier)

  if (onboardingStatus === 'awaiting_access') {
    return {
      title: 'E-Mail bestätigen',
      detail: 'Der Supplier braucht jetzt manuelle Bestätigung oder Restdaten durch den Admin.',
      tone: 'warning' as const,
      actionLabel: 'Zugang abschließen',
    }
  }

  if (onboardingStatus !== 'connected') {
    return {
      title: 'Registrierung starten',
      detail: hasRegistrationTarget(supplier)
        ? 'Ein Klick startet den hybriden Onboarding-Run für diesen Supplier.'
        : 'Es fehlt noch ein registrierbarer Ziel-Link oder API-Endpunkt.',
      tone: hasRegistrationTarget(supplier) ? ('info' as const) : ('warning' as const),
      actionLabel: 'Registrieren',
    }
  }

  if (mappingCount <= 0) {
    return {
      title: 'Produkte auswählen',
      detail: 'Der Supplier ist verbunden. Jetzt müssen Shop-Produkte dem Lieferanten zugeordnet werden.',
      tone: 'warning' as const,
      actionLabel: 'Produkte prüfen',
    }
  }

  if (compliance !== 'approved' || (status !== 'approved' && status !== 'active')) {
    return {
      title: 'Freigabe prüfen',
      detail: 'Autopilot-Bestellungen sollten erst nach Compliance- und Supplier-Freigabe live gehen.',
      tone: 'warning' as const,
      actionLabel: 'Freigeben',
    }
  }

  if (!channelReady) {
    return {
      title: 'Fulfillment-Kanal fehlt',
      detail: 'Für den Order-Autopilot braucht der Supplier einen API- oder E-Mail-Kanal.',
      tone: 'danger' as const,
      actionLabel: 'Kanal setzen',
    }
  }

  if (!autoFulfillEnabled) {
    return {
      title: 'Autopilot aktivieren',
      detail: 'Alle Kernvoraussetzungen sind erfüllt. Jetzt kann die automatische Lieferantenbestellung live gehen.',
      tone: 'info' as const,
      actionLabel: 'Autopilot aktivieren',
    }
  }

  return {
    title: 'Betriebsbereit',
    detail: 'Supplier ist verbunden, zugeordnet und für automatische Bestellungen vorbereitet.',
    tone: 'success' as const,
    actionLabel: 'Überwachen',
  }
}

export function isSupplierAutopilotReady(supplier: SupplierLike, mappingCount = 0, globalReady = true) {
  const status = (supplier.status || '').trim()
  const compliance = (supplier.compliance_state || '').trim()
  const onboardingStatus = (supplier.onboarding_status || '').trim()

  return Boolean(
    globalReady &&
      supplier.auto_fulfill_enabled &&
      onboardingStatus === 'connected' &&
      mappingCount > 0 &&
      hasFulfillmentChannel(supplier) &&
      (status === 'approved' || status === 'active') &&
      compliance === 'approved',
  )
}
