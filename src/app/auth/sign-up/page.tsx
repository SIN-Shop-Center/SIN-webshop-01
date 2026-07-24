// Purpose: Sign-up page (Step 2 + Step 10 — a11y, password hint)
// Docs: PLAN-VERKAUFSFAEHIG.md

'use client'

import { useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { translateAuthError } from '@/lib/auth-errors'
import { PasswordInput } from '@/components/PasswordInput'
import { AlertCircleIcon, SpinnerIcon } from '@/components/icons'
import { checkRateLimit, RateLimitError } from '@/lib/rate-limit'

export default function SignUpPage() {
  const emailId = useId()
  const passwordId = useId()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Issue #41: Rate-Limit 3 Registrierungen / Std pro IP
    try {
      await checkRateLimit('signup', { limit: 3, windowSec: 3600 })
    } catch (e) {
      if (e instanceof RateLimitError) {
        setError(
          'Zu viele Registrierungen. Bitte in einer Stunde erneut versuchen.',
        )
        setLoading(false)
        return
      }
      throw e
    }

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(translateAuthError(error.message))
      setLoading(false)
      return
    }

    router.push('/auth/sign-up-success')
  }

  return (
    <div className="container mx-auto flex min-h-[60vh] max-w-md items-center px-4 py-12">
      <div className="w-full">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">Konto erstellen</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Erstelle ein Konto, um deine Bestellungen zu verfolgen und eine
          Wunschliste zu führen.
        </p>
        <form onSubmit={handleSignUp} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={emailId} className="text-sm font-medium">
              E-Mail
            </label>
            <input
              id={emailId}
              type="email"
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
              autoComplete="new-password"
              minLength={8}
            />
            <p className="field-hint">Mindestens 8 Zeichen.</p>
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
                Wird erstellt…
              </>
            ) : (
              'Registrieren'
            )}
          </button>
        </form>
        <p className="mt-6 text-sm text-muted-foreground">
          Bereits ein Konto?{' '}
          <Link href="/auth/login" className="font-medium text-primary underline">
            Anmelden
          </Link>
        </p>
      </div>
    </div>
  )
}
