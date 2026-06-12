'use client'

// Purpose: TOTP-Code-Eingabe → AAL2-Session (Issue #50)

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function VerifyForm({ factorId }: { factorId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    startTransition(async () => {
      setError('')
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId })
      if (challengeError) {
        setError(challengeError.message)
        return
      }
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      })
      if (verifyError) {
        setError('Code ungültig. Bitte erneut versuchen.')
        return
      }
      router.replace('/admin')
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm font-medium">
        6-stelliger Code
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          className="rounded-md border border-input bg-background px-3 py-2 text-center font-mono text-lg tracking-widest"
        />
      </label>
      <button
        type="button"
        disabled={code.length !== 6 || isPending}
        onClick={handleSubmit}
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Wird geprüft…' : 'Bestätigen'}
      </button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
