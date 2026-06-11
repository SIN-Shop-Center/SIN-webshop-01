'use client'

// Purpose: Single Return-Row in Admin-List (Issue #45 Admin-UI)

import { useTransition, useState } from 'react'
import { approveAndRefund, rejectReturn } from '@/app/lib/actions/returns'

interface ReturnItem {
  id: string
  reason: string
  status: string
  created_at: string
  refund_amount_cents: number | null
  orders: { id: string; email: string; amount_total: number } | { id: string; email: string; amount_total: number }[] | null
}

export function ReturnRow({ ret }: { ret: ReturnItem }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const order = Array.isArray(ret.orders) ? ret.orders[0] : ret.orders
  const isPendingStatus = ret.status === 'pending'

  if (done && ret.status === 'pending') {
    return (
      <li className="rounded-lg border border-border p-4 opacity-60">
        <p className="text-sm text-muted-foreground">Bearbeitet.</p>
      </li>
    )
  }

  return (
    <li className="rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">
            {order?.email ?? '—'}
          </span>
          <span className="text-sm text-muted-foreground">{ret.reason}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(ret.created_at).toLocaleString('de-DE')} · Bestellwert:{' '}
            {((order?.amount_total ?? 0) / 100).toFixed(2).replace('.', ',')} €
          </span>
        </div>
        {isPendingStatus ? (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await approveAndRefund(ret.id)
                    setDone(true)
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Fehler')
                  }
                })
              }
              className="btn btn-primary btn-sm"
            >
              {isPending ? '…' : 'Erstatten'}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await rejectReturn(ret.id)
                    setDone(true)
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Fehler')
                  }
                })
              }
              className="btn btn-outline btn-sm"
            >
              Ablehnen
            </button>
          </div>
        ) : (
          <span className="rounded-full bg-muted px-3 py-1 text-xs">
            {ret.status}
          </span>
        )}
      </div>
      {error && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </li>
  )
}
