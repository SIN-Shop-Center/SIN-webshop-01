// Purpose: Guest order tracking page
// Docs: AGENTS.md

'use client'

import { useState, useTransition } from 'react'
import { PackageSearch } from 'lucide-react'
import { trackOrder } from '@/app/actions/track-order'

type OrderResult = {
  id: string
  status: string
  created_at: string
  total: number
} | null

const statusLabels: Record<string, string> = {
  paid: 'Bezahlt — wird bearbeitet',
  processing: 'In Bearbeitung',
  shipped: 'Versandt',
  delivered: 'Zugestellt',
}

export default function BestellungVerfolgenPage() {
  const [orderId, setOrderId] = useState('')
  const [email, setEmail] = useState('')
  const [result, setResult] = useState<OrderResult>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <div className="container mx-auto max-w-md px-4 py-12">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <PackageSearch className="size-10 text-primary" aria-hidden="true" />
        <h1 className="text-2xl font-bold">Bestellung verfolgen</h1>
        <p className="text-sm text-muted-foreground text-pretty">
          Gib deine Bestellnummer und E-Mail-Adresse ein — beides findest du in deiner Bestellbestätigung.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          setError(null)
          setResult(null)
          startTransition(async () => {
            const res = await trackOrder({ orderId: orderId.trim(), email: email.trim() })
            if (res.error) setError(res.error)
            else setResult(res.order ?? null)
          })
        }}
        className="flex flex-col gap-3"
      >
        <input
          type="text"
          required
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          placeholder="Bestellnummer"
          aria-label="Bestellnummer"
          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-Mail-Adresse"
          aria-label="E-Mail-Adresse"
          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Wird gesucht…' : 'Bestellung suchen'}
        </button>
      </form>

      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}

      {result && (
        <div className="mt-6 rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Bestellung vom {new Date(result.created_at).toLocaleDateString('de-DE')}</p>
          <p className="mt-1 text-lg font-bold">{statusLabels[result.status] ?? result.status}</p>
          <p className="mt-1 text-sm">
            Gesamtbetrag:{' '}
            {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(result.total)}
          </p>
        </div>
      )}
    </div>
  )
}
