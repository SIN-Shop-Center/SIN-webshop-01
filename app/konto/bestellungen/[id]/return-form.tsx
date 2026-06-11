'use client'

// Purpose: Return-Request Form (Issue #45 UI)
// Docs: BGB § 312g — 14-Tage-Widerrufsrecht
//
// Wird auf /konto/bestellungen/[id] gerendert, wenn Bestellung < 14 Tage
// und Status in {paid, shipped, delivered}.

import { useState, useTransition } from 'react'
import { createReturnRequest } from '@/app/lib/actions/returns'

const REASONS = [
  'Artikel beschädigt',
  'Falscher Artikel geliefert',
  'Entspricht nicht der Beschreibung',
  'Widerruf ohne Angabe von Gründen',
] as const

export function ReturnForm({ orderId }: { orderId: string }) {
  const [reason, setReason] = useState<string>('')
  const [details, setDetails] = useState('')
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      try {
        await createReturnRequest(
          orderId,
          `${reason}${details ? ` — ${details}` : ''}`,
        )
        setStatus('success')
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Fehler')
        setStatus('error')
      }
    })
  }

  if (status === 'success') {
    return (
      <p
        className="rounded-md bg-muted p-4 text-sm"
        role="status"
      >
        Deine Rücksendeanfrage wurde eingereicht. Du erhältst eine E-Mail,
        sobald sie geprüft wurde.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Grund der Rücksendung</legend>
        {REASONS.map((r) => (
          <label key={r} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="reason"
              value={r}
              checked={reason === r}
              onChange={() => setReason(r)}
              required
            />
            {r}
          </label>
        ))}
      </fieldset>
      <label className="flex flex-col gap-1 text-sm">
        Details (optional)
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={500}
          rows={3}
          className="rounded-md border border-input bg-background p-2"
        />
      </label>
      {status === 'error' && (
        <p className="text-sm text-destructive" role="alert">
          {errorMsg}
        </p>
      )}
      <button
        type="submit"
        disabled={!reason || isPending}
        className="btn btn-primary btn-md self-start"
      >
        {isPending ? 'Wird gesendet…' : 'Rücksendung anfragen'}
      </button>
    </form>
  )
}
