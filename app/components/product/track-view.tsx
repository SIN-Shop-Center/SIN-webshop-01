'use client'

import { useEffect } from 'react'

export function TrackView({ productId }: { productId: string }) {
  useEffect(() => {
    const existing = document.cookie
      .split('; ')
      .find((c) => c.startsWith('recently_viewed='))
      ?.split('=')[1]

    const ids = existing ? decodeURIComponent(existing).split(',') : []
    const next = [productId, ...ids.filter((id) => id !== productId)].slice(0, 12)

    document.cookie = `recently_viewed=${encodeURIComponent(next.join(','))}; path=/; max-age=${
      60 * 60 * 24 * 30
    }; SameSite=Lax`
  }, [productId])

  return null
}
