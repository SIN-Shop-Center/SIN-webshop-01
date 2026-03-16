'use client'

import Link from '@/components/ui/Link'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Mail, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { createBrowserClient } from '@/lib/supabase'
import { LoginPageMessages, LoginSecurityInfo } from './LoginPageSections'
import { normalizeNextPath } from './login-utils'

export function LoginPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedNext = searchParams.get('next')
  const nextPath = useMemo(() => normalizeNextPath(searchParams.get('next')), [searchParams])
  const adminLogin = nextPath.startsWith('/admin')
  const authConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const urlError = searchParams.get('error')
  const urlMessage = searchParams.get('message')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  useEffect(() => {
    let mounted = true
    const run = async () => {
      if (!authConfigured) {
        return
      }
      try {
        const supabase = createBrowserClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (mounted && session) {
          router.replace(nextPath)
        }
      } catch {
        // Ignore env/session errors here and let the form show feedback on submit.
      }
    }
    void run()
    return () => {
      mounted = false
    }
  }, [authConfigured, nextPath, router])

  const handlePasswordLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!authConfigured) {
      setError('Login ist in dieser Umgebung noch nicht aktiviert.')
      return
    }
    setBusy(true)
    setError(null)
    setSuccess(null)

    try {
      const supabase = createBrowserClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (signInError) {
        setError(signInError.message)
        return
      }
      router.replace(nextPath)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Anmeldung fehlgeschlagen.')
    } finally {
      setBusy(false)
    }
  }

  const handleMagicLink = async () => {
    if (!authConfigured) {
      setError('Login ist in dieser Umgebung noch nicht aktiviert.')
      return
    }
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      const supabase = createBrowserClient()
      const redirectBase = window.location.origin + '/auth/callback'
      const redirectTo = `${redirectBase}?next=${encodeURIComponent(nextPath)}`
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: redirectTo,
        },
      })
      if (otpError) {
        setError(otpError.message)
        return
      }
      setSuccess('Magic-Link wurde gesendet. Bitte E-Mails prüfen.')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Versand des Magic-Links fehlgeschlagen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="shell-container py-16">
      <section className="mx-auto w-full max-w-xl rounded-3xl border border-brand-border bg-white p-8 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-text-muted">
            {adminLogin ? 'Admin-Login' : 'Kunden-Login'}
          </p>
          <h1 className="mt-2 text-4xl">{adminLogin ? 'Admincenter anmelden' : 'Kundencenter anmelden'}</h1>
          <p className="mt-2 text-brand-text-muted">
            {adminLogin
              ? 'Nur für Admin- und Ops-Konten mit Zugriff auf das Admincenter.'
              : 'Bestellungen, Profil und Adressen an einem Ort verwalten.'}
          </p>
          {!authConfigured ? (
            <p className="mt-3 text-sm text-brand-text-muted">
              Diese Umgebung zeigt bereits die getrennten Bereiche für Shop, Kundencenter und Admincenter. Die finale Login-Konfiguration fehlt noch.
            </p>
          ) : null}
          <div className="mt-5 inline-flex flex-wrap items-center gap-2 rounded-full border border-brand-border bg-brand-surface p-1">
            <Link
              href="/login?next=/kundencenter"
              prefetch={false}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                !adminLogin ? 'bg-black text-white' : 'text-brand-text-muted hover:bg-white hover:text-brand-text'
              }`}
            >
              Kundencenter
            </Link>
            <Link
              href="/login?next=/admin"
              prefetch={false}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                adminLogin ? 'bg-black text-white' : 'text-brand-text-muted hover:bg-white hover:text-brand-text'
              }`}
            >
              Admincenter
            </Link>
          </div>
          {!requestedNext ? (
            <p className="mt-3 text-sm text-brand-text-muted">
              Wähle den Bereich, in den du dich einloggen willst. Der Shop selbst bleibt ohne Login öffentlich.
            </p>
          ) : null}
        </div>

        <form className="space-y-4" onSubmit={handlePasswordLogin}>
          <label className="block text-sm font-medium text-brand-text">
            E-Mail
            <input
              type="email"
              autoComplete="email"
              required
              suppressHydrationWarning
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={!authConfigured}
              className="mt-1 w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
              placeholder="name@firma.de"
            />
          </label>

          <label className="block text-sm font-medium text-brand-text">
            Passwort
            <input
              type="password"
              autoComplete="current-password"
              required
              suppressHydrationWarning
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={!authConfigured}
              className="mt-1 w-full rounded-xl border border-brand-border px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
              placeholder="Passwort eingeben"
            />
          </label>

          <LoginPageMessages urlError={urlError} error={error} urlMessage={urlMessage} success={success} />

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              type="submit"
              variant="primary"
              isLoading={busy}
              leftIcon={<KeyRound className="h-4 w-4" />}
              disabled={!authConfigured || !email.trim() || !password}
            >
              Mit Passwort
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleMagicLink}
              isLoading={busy}
              leftIcon={<Mail className="h-4 w-4" />}
              disabled={!authConfigured || !email.trim()}
            >
              Magic-Link
            </Button>
          </div>
        </form>

        <LoginSecurityInfo />
      </section>
    </main>
  )
}
