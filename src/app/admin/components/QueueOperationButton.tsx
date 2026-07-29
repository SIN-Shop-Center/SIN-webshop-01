'use client'

import { useState, useTransition } from 'react'
import { LoaderCircle, Play } from 'lucide-react'
import { enqueueCommerceOperation } from '@/lib/actions/operations/enqueue'
import type { CommerceOperation } from '@/lib/actions/operations/types'

export function QueueOperationButton({
  operation,
  label,
  variant = 'primary',
}: {
  operation: CommerceOperation
  label: string
  variant?: 'primary' | 'outline' | 'ghost'
}) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  function run() {
    setMessage(null)
    startTransition(async () => {
      const result = await enqueueCommerceOperation(operation)
      setOk(result.ok)
      setMessage(result.message)
      window.setTimeout(() => setMessage(null), 4500)
    })
  }

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className={`btn btn-${variant} btn-md`}
      >
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
        ) : (
          <Play className="size-4" aria-hidden />
        )}
        {pending ? 'Wird eingeplant…' : label}
      </button>
      {message ? (
        <div
          role="status"
          className={`absolute right-0 top-full z-20 mt-2 w-72 rounded-lg border bg-background p-3 text-xs shadow-lg ${
            ok ? 'border-success/30' : 'border-destructive/30'
          }`}
        >
          {message}
        </div>
      ) : null}
    </div>
  )
}
