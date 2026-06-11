// Purpose: Login page (Step 2 + Step 10 — a11y, htmlFor+id)
// Docs: PLAN-VERKAUFSFAEHIG.md

'use client'

import { useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AlertCircleIcon, SpinnerIcon } from '@/components/icons'

export default function LoginPage() {
  const emailId = useId()
  const passwordId = useId()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="container mx-auto flex min-h-[60vh] max-w-md items-center px-4 py-12">
      <div className="w-full">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">Anmelden</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Willkommen zurück! Melde dich an, um deine Bestellungen und
          Wunschliste zu sehen.
        </p>
        <form onSubmit={handleLogin} className="flex flex-col gap-4" noValidate>
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
            <input
              id={passwordId}
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field-input"
              autoComplete="current-password"
            />
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
    </div>
  )
}
