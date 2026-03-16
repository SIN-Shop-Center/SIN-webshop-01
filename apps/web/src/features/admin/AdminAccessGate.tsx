'use client'

import { ReactNode, useEffect, useState } from 'react'
import Link from '@/components/ui/Link'
import { ArrowRight, LockKeyhole, ShieldAlert } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { getAuthHeaders } from '@/lib/api/auth'

type GuardState = 'loading' | 'authorized' | 'unauthorized' | 'error'

function isPrivilegedRole(role: unknown) {
  return role === 'admin' || role === 'ops'
}

export function AdminAccessGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/admin'
  const [state, setState] = useState<GuardState>('loading')
  const [detail, setDetail] = useState<string>('Berechtigung wird geprüft…')
  const loginHref = `/login?next=${encodeURIComponent(pathname)}`

  useEffect(() => {
    let active = true

    const run = async () => {
      setState('loading')
      try {
        const response = await fetch('/api/account/me', {
          method: 'GET',
          cache: 'no-store',
          headers: await getAuthHeaders(),
        })
        if (!active) {
          return
        }
        if (response.status === 401 || response.status === 403) {
          setState('unauthorized')
          setDetail('Bitte mit einem Admin- oder Ops-Konto anmelden.')
          return
        }
        if (!response.ok) {
          setState('error')
          setDetail(`Account-Prüfung fehlgeschlagen (${response.status}).`)
          return
        }

        const payload = (await response.json()) as { role?: string }
        if (!isPrivilegedRole(payload?.role)) {
          setState('unauthorized')
          setDetail('Dein Konto hat keinen Zugriff auf den Admin-Bereich.')
          return
        }
        setState('authorized')
      } catch {
        if (active) {
          setState('error')
          setDetail('Admin-Zugriff konnte nicht geprüft werden.')
        }
      }
    }

    void run()
    return () => {
      active = false
    }
  }, [])

  if (state === 'authorized') {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.9),transparent_22%),linear-gradient(180deg,#ebe5da_0%,#f5f2eb_24%,#f7f4ed_100%)]">
      <section className="shell-container py-10">
        <section className="panel-elevated mx-auto max-w-2xl overflow-hidden">
          <div className="border-b border-brand-border bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(243,240,234,0.78))] px-6 py-6 text-center">
            <span className="mx-auto inline-flex rounded-3xl bg-black p-3 text-white shadow-lg">
              {state === 'loading' ? <LockKeyhole className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
            </span>
            <p className="mt-4 section-eyebrow">{state === 'loading' ? 'Berechtigung' : 'Admin Zugriff'}</p>
            <h1 className="mt-2 text-3xl">
              {state === 'loading' ? 'Zugriff wird geprüft' : 'Diese Fläche ist geschützt'}
            </h1>
            <p className="mt-3 text-sm leading-6 text-brand-text-muted">{detail}</p>
          </div>

          <div className="px-6 py-6">
            <div className="rounded-2xl border border-brand-border bg-white px-4 py-4 text-sm text-brand-text-muted">
              Nutze ein Admin- oder Ops-Konto und kehre danach direkt in diese Fläche zurück.
            </div>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link
                href={loginHref}
                className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-accent-strong"
              >
                Admin anmelden
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-brand-border bg-white px-5 py-3 text-sm font-semibold text-brand-text transition-colors hover:border-brand-border-strong"
              >
                Zur Startseite
              </Link>
            </div>
          </div>
        </section>
      </section>
    </div>
  )
}
