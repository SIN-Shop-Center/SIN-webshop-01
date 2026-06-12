// Purpose: Email capture for out-of-stock product notifications
// Docs: AGENTS.md

'use client'

import { useState, useTransition } from 'react'
import { BellRing } from 'lucide-react'
import { subscribeBackInStock } from '@/app/actions/back-in-stock'

export function BackInStock({ productId }: { productId: string }) {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (done) {
    return (
      <p role="status" className="rounded-md bg-primary/10 px-3 py-2.5 text-sm font-medium text-primary">
        Alles klar! Wir benachrichtigen dich, sobald der Artikel wieder da ist.
      </p>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        setError(null)
        startTransition(async () => {
          const result = await subscribeBackInStock({ productId, email })
          if (result.error) setError(result.error)
          else setDone(true)
        })
      }}
      className="flex flex-col gap-2 rounded-lg border border-border bg-muted/50 p-4"
    >
      <p className="flex items-center gap-2 text-sm font-semibold">
        <BellRing className="size-4 text-primary" aria-hidden="true" />
        Derzeit ausverkauft — lass dich benachrichtigen
      </p>
      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="deine@email.de"
          aria-label="E-Mail für Verfügbarkeits-Benachrichtigung"
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={isPending}
          className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? '…' : 'Benachrichtigen'}
        </button>
      </div>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </form>
  )
}
