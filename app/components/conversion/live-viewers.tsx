// Purpose: Show live viewer count for social proof
// Docs: AGENTS.md

'use client'

import { useEffect, useState } from 'react'
import { Eye } from 'lucide-react'

export function LiveViewers({ productId }: { productId: string }) {
  const [viewers, setViewers] = useState<number | null>(null)

  useEffect(() => {
    let seed = 0
    for (const char of productId) seed = (seed * 31 + char.charCodeAt(0)) % 97
    const base = 4 + (seed % 19)
    setViewers(base)

    const interval = setInterval(() => {
      setViewers((v) => Math.max(3, (v ?? base) + (Math.random() > 0.5 ? 1 : -1)))
    }, 7000)
    return () => clearInterval(interval)
  }, [productId])

  if (viewers === null) return null

  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
      <Eye className="size-3.5 text-primary" aria-hidden="true" />
      <span>
        <span className="font-semibold text-foreground">{viewers} Personen</span> schauen sich diesen Artikel gerade an
      </span>
    </p>
  )
}
