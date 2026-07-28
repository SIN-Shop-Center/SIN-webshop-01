// Purpose: Password update page — handles the reset link redirect from Supabase Auth
// Docs: PLAN-VERKAUFSFAEHIG.md

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function PasswortAktualisierenPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setError('Das Passwort muss mindestens 8 Zeichen lang sein.')
      return
    }
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password })

    if (err) {
      setError('Aktualisierung fehlgeschlagen. Fordere ggf. einen neuen Link an.')
      setLoading(false)
    } else {
      router.push('/konto/bestellungen')
      router.refresh()
    }
  }

  return (
    <div className="container mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold">Neues Passwort festlegen</h1>
      <p className="mb-6 text-sm text-muted-foreground">Wähle ein neues Passwort für dein Konto.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium">Neues Passwort</label>
          <div className="relative">
            <input
              id="password"
              type={show ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field-input w-full pr-20"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              {show ? 'Verbergen' : 'Anzeigen'}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Mindestens 8 Zeichen.</p>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full">
          {loading ? 'Wird gespeichert…' : 'Passwort speichern'}
        </button>
      </form>
    </div>
  )
}
