'use client'

// Purpose: "Benachrichtigen, wenn wieder verfügbar" (Issue #53 UI)

import { useState, useTransition } from 'react'
import { subscribeStockAlert } from '@/app/lib/actions/stock-alerts'

export function StockAlertForm({ productId }: { productId: string }) {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  if (done) {
    return (
      <p
        className="text-sm text-muted-foreground"
        role="status"
      >
        Wir benachrichtigen dich, sobald der Artikel wieder verfügbar ist.
      </p>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        startTransition(async () => {
          try {
            await subscribeStockAlert(productId, email)
            setDone(true)
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Fehler')
          }
        })
      }}
      className="flex flex-col gap-2"
    >
      <label htmlFor="alert-email" className="text-sm font-medium">
        Benachrichtigen, wenn wieder verfügbar
      </label>
      <div className="flex gap-2">
        <input
          id="alert-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="deine@email.de"
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={isPending}
          className="btn btn-primary btn-sm"
        >
          {isPending ? '…' : 'Eintragen'}
        </button>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
