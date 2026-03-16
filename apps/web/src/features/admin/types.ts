import type { LucideIcon } from 'lucide-react'

export type AdminDomainLink = {
  title: string
  href: string
  description: string
  shortLabel?: string
  badge?: string
  icon?: LucideIcon
  section?: 'workspace' | 'operations'
  exact?: boolean
}

export type AlertRecord = {
  name: string
  triggered: boolean
  severity: string
  reason: string
}

export type AnalyticsAlertResponse = {
  windowHours: number
  alerts: AlertRecord[]
}

export type HealthStatus = {
  ok: boolean
  label: string
  detail: string
}
