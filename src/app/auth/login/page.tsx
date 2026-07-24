// Purpose: Login page — German errors, password toggle, redirect-back support
// Docs: PLAN-VERKAUFSFAEHIG.md (Step 2 + Step 10)

'use client'

import { Suspense, useId, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { translateAuthError } from '@/lib/auth-errors'
import { PasswordInput } from '@/components/PasswordInput'
import { AlertCircleIcon, SpinnerIcon } from '@/components/icons'
import { checkRateLimit, RateLimitError } from '@/lib/rate-limit'

function safeRedirect(target: string | null): string {
  if (target && target.startsWith('/') && !target.startsWith('//')) {
    return target
  }
  return '/'
}

function LoginForm() {
  const emailId = useId()
  const passwordId = useId()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Issue #41: Rate-Limit 5 Versuche / 5 Min pro IP gegen Brute-Force
    try {
      await checkRateLimit('login', { limit: 5, windowSec: 300 })
    } catch (e) {
      if (e instanceof RateLimitError) {
        setError(
          'Zu viele Anmeldeversuche. Bitte in einigen Minuten erneut versuchen.',
        )
        setLoading(false)
        return
      }
      throw e
    }

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(translateAuthError(error.message))
      setLoading(false)
      return
    }

    router.push(safeRedirect(searchParams.get('redirect')))
    router.refresh()
  }

  return (
    <div className="w-full">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Anmelden</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Willkommen zurück! Melde dich an, um deine Bestellungen und Wunschliste
        zu sehen.
      </p>
      <form onSubmit={handleLogin} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={emailId} className="text-sm font-medium">
            E-Mail
          </label>
          <input
            id={emailId}
            type="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field-input"
            autoComplete="email"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={passwordId} className="text-sm font-medium">
            Passwort
          </label>
          <PasswordInput
            id={passwordId}
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />
        </div>
        <div className="flex justify-end -mt-2">
          <Link
            href="/auth/passwort-vergessen"
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Passwort vergessen?
          </Link>
        </div>
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            <AlertCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary btn-lg w-full"
        >
          {loading ? (
            <>
              <SpinnerIcon className="size-5 animate-spin" aria-hidden />
              Wird angemeldet…
            </>
          ) : (
            'Anmelden'
          )}
        </button>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">
        Noch kein Konto?{' '}
        <Link href="/auth/sign-up" className="font-medium text-primary underline">
          Registrieren
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="container mx-auto flex min-h-[60vh] max-w-md items-center px-4 py-12">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
