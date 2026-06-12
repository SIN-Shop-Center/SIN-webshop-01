'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const CONSENT_COOKIE = 'sin-cookie-consent'

function getConsent(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function setConsent(value: 'all' | 'essential') {
  const oneYear = 60 * 60 * 24 * 365
  document.cookie = `${CONSENT_COOKIE}=${value}; max-age=${oneYear}; path=/; SameSite=Lax; Secure`
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!getConsent()) setVisible(true)
  }, [])

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie-Einwilligung"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card p-3 shadow-lg md:inset-x-auto md:bottom-4 md:right-4 md:max-w-sm md:rounded-lg md:border md:shadow-xl"
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
        <p className="flex-1 text-xs leading-snug text-card-foreground text-pretty">
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
            onClick={() => setConsent('essential')}
            className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
          >
            Nur notwendige
          </button>
          <button
            type="button"
            onClick={() => setConsent('all')}
            className="rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            Alle akzeptieren
          </button>
        </div>
      </div>
    </div>
  )
}
