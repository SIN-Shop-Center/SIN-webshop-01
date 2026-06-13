// app/components/cookie-consent.tsx
// Purpose: Cookie consent banner with focus trap and return focus
// Docs: AGENTS.md

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useFocusTrap } from '@/lib/hooks/use-focus-trap'

const CONSENT_COOKIE = 'sin-cookie-consent'

function getConsent(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function setConsent(value: 'all' | 'essential') {
  const oneYear = 60 * 60 * 24 * 365
  document.cookie = `${CONSENT_COOKIE}=${value}; max-age=${oneYear}; path=/; SameSite=Lax; Secure`
  window.dispatchEvent(new CustomEvent('sin:consent', { detail: value }))
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const trapRef = useFocusTrap(visible)

  useEffect(() => {
    if (!getConsent()) setVisible(true)
  }, [])

  function choose(value: 'all' | 'essential') {
    setConsent(value)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      ref={trapRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-consent-desc"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-card p-3 shadow-lg md:inset-x-auto md:bottom-auto md:right-4 md:top-4 md:max-w-sm md:rounded-lg md:border md:shadow-xl"
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
        <p id="cookie-consent-desc" className="flex-1 text-xs leading-snug text-card-foreground text-pretty">
          Wir verwenden Cookies, um den Shop zu betreiben (z.&nbsp;B. Warenkorb und
          Bezahlung). Details findest du in unserer{' '}
          <Link href="/datenschutz" className="underline hover:text-foreground">
            Datenschutzerklärung
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => choose('essential')}
            className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Nur notwendige
          </button>
          <button
            type="button"
            onClick={() => choose('all')}
            autoFocus
            className="rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Alle akzeptieren
          </button>
        </div>
      </div>
    </div>
  )
}
