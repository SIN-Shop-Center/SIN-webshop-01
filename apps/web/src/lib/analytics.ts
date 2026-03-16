import { AnalyticsEventSchema, type AnalyticsEvent, type AnalyticsEventType } from '@simone/contracts'
import { useCustomerSegmentStore } from '@/features/segment/store'

type TrackOptions = {
  payload?: Record<string, unknown>
  segment?: AnalyticsEvent['segment']
  route?: string
}

const ANALYTICS_BACKOFF_MS = 60_000
const ANALYTICS_DISABLED_UNTIL_KEY = 'simone.analytics.disabled-until'
let analyticsDisabledUntil = 0

function analyticsDisabledByConfig(): boolean {
  const configured = (process.env.NEXT_PUBLIC_WEB_ANALYTICS_ENABLED || '').trim().toLowerCase()
  if (configured === 'false') {
    return true
  }
  if (configured === 'true') {
    return false
  }

  return (process.env.NEXT_PUBLIC_WEB_CATALOG_FALLBACK_ENABLED || '').trim().toLowerCase() === 'true'
}

function readDisabledUntilFromStorage(): number {
  if (typeof window === 'undefined') {
    return 0
  }

  try {
    const raw = window.localStorage.getItem(ANALYTICS_DISABLED_UNTIL_KEY)
    const parsed = Number.parseInt(raw || '', 10)
    return Number.isFinite(parsed) ? parsed : 0
  } catch {
    return 0
  }
}

function persistDisabledUntil(value: number) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(ANALYTICS_DISABLED_UNTIL_KEY, String(value))
  } catch {
    // Ignore localStorage write failures (private mode, quota, etc.)
  }
}

function currentRoute(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }
  return `${window.location.pathname}${window.location.search}`
}

function currentExperimentAssignments(): Record<string, string> {
  if (typeof window === 'undefined') {
    return {}
  }

  const assignments: Record<string, string> = {}
  const prefix = 'simone-exp:'
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)
    if (!key || !key.startsWith(prefix)) {
      continue
    }
    const experimentId = key.slice(prefix.length)
    const variant = window.localStorage.getItem(key)
    if (experimentId && variant) {
      assignments[experimentId] = variant
    }
  }
  return assignments
}

export async function trackEvent(type: AnalyticsEventType, options: TrackOptions = {}) {
  const disabledUntil = Math.max(analyticsDisabledUntil, readDisabledUntilFromStorage())
  analyticsDisabledUntil = disabledUntil

  if (analyticsDisabledByConfig() || Date.now() < disabledUntil) {
    return
  }

  const segment = options.segment || useCustomerSegmentStore.getState().segment
  const payload = {
    ...(options.payload || {}),
    _experiments: currentExperimentAssignments(),
  }
  const event = AnalyticsEventSchema.parse({
    type,
    segment,
    occurredAt: new Date().toISOString(),
    route: options.route || currentRoute(),
    payload,
  })

  try {
    // Prefer sendBeacon to avoid aborted requests during fast navigations/unloads.
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      try {
        const blob = new Blob([JSON.stringify(event)], { type: 'application/json' })
        if (navigator.sendBeacon('/api/analytics', blob)) {
          return
        }
      } catch {
        // Fall back to fetch.
      }
    }

    const response = await fetch('/api/analytics', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(event),
      keepalive: true,
    })
    if (!response.ok && response.status >= 500) {
      analyticsDisabledUntil = Date.now() + ANALYTICS_BACKOFF_MS
      persistDisabledUntil(analyticsDisabledUntil)
    }
  } catch {
    analyticsDisabledUntil = Date.now() + ANALYTICS_BACKOFF_MS
    persistDisabledUntil(analyticsDisabledUntil)
    // Tracking is best-effort and must never block checkout or navigation.
  }
}
