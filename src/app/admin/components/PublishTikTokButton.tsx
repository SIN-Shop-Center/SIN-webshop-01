// Purpose: Admin-Button — Produkt sofort zu TikTok Shop publishen
// Docs: docs/TIKTOK_SHOP_API_INTEGRATION.md

'use client'

import { useState, useTransition } from 'react'

import { publishToTikTok } from '@/lib/actions/tiktok'

export function PublishTikTokButton({
  productId,
  tiktokProductId,
}: {
  productId: string
  tiktokProductId: string | null
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [published, setPublished] = useState(Boolean(tiktokProductId))

  if (published) {
    return <span className="text-xs text-green-600">TikTok ✓</span>
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(null)
          startTransition(async () => {
            const result = await publishToTikTok(productId)
            if (result.ok) {
              setPublished(true)
            } else {
              setError(result.error)
            }
          })
        }}
        className="rounded bg-black px-2 py-1 text-xs text-white disabled:opacity-50"
      >
        {isPending ? 'Publishe…' : 'Zu TikTok'}
      </button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  )
}
