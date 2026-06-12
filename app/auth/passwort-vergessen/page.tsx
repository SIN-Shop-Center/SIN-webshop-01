// Purpose: Password reset request page — sends reset email via Supabase Auth
// Docs: PLAN-VERKAUFSFAEHIG.md

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function PasswortVergessenPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/passwort-aktualisieren`,
    })

    if (err) {
      setError('Das hat leider nicht geklappt. Bitte versuche es erneut.')
      setLoading(false)
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div className="container mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-12">
        <h1 className="mb-2 text-2xl font-bold">E-Mail unterwegs</h1>
        <div role="status" className="rounded-md border border-border bg-muted p-4 text-sm">
          Wenn ein Konto mit dieser E-Mail existiert, haben wir dir einen Link geschickt. Prüfe auch deinen Spam-Ordner.
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Zurück zur{' '}
          <Link href="/auth/login" className="font-medium text-foreground underline underline-offset-4">
            Anmeldung
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="container mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold">Passwort vergessen</h1>
      <p className="mb-6 text-sm text-muted-foreground text-pretty">
        Gib deine E-Mail-Adresse ein. Wir senden dir einen Link, mit dem du ein neues Passwort festlegen kannst.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">E-Mail</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field-input"
          />
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full">
          {loading ? 'Wird gesendet…' : 'Link anfordern'}
        </button>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">
        Zurück zur{' '}
        <Link href="/auth/login" className="font-medium text-foreground underline underline-offset-4">
          Anmeldung
        </Link>
      </p>
    </div>
  )
}
