'use client'

// Purpose: Client-seitiges TOTP-Enroll + Verify (Issue #50)

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function EnrollForm() {
  const router = useRouter()
  const supabase = createClient()
  const [factorId, setFactorId] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [isVerifying, startVerify] = useTransition()

  useEffect(() => {
    let cancelled = false
    async function enroll() {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Admin TOTP',
      })
      if (cancelled) return
      if (error) {
        setError(error.message)
        return
      }
      setFactorId(data.id)
      setQrCode(data.totp.qr_code)
      setSecret(data.totp.secret)
    }
    enroll()
    return () => {
      cancelled = true
    }
  }, [supabase])

  function handleVerify() {
    if (!factorId) return
    startVerify(async () => {
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
      {qrCode ? (
        <>
          {/* qr_code ist ein data:image/svg+xml-URI von Supabase */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrCode || '/placeholder.svg'}
            alt="TOTP QR-Code zum Scannen mit der Authenticator-App"
            className="h-48 w-48 self-center rounded-md border border-border bg-white p-2"
          />
          {secret && (
            <p className="text-center font-mono text-xs text-muted-foreground">
              Manuell: {secret}
            </p>
          )}
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
            disabled={code.length !== 6 || isVerifying}
            onClick={handleVerify}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {isVerifying ? 'Wird geprüft…' : 'Aktivieren'}
          </button>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">QR-Code wird erstellt…</p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
