// Purpose: Next/Image wrapper that falls back to a placeholder on broken CJ CDN URLs
// Docs: AGENTS.md

'use client'

import Image, { type ImageProps } from 'next/image'
import { useState } from 'react'
import { PackageOpen } from 'lucide-react'

type ImageWithFallbackProps = Omit<ImageProps, 'src'> & {
  src?: string | null
}

export function ImageWithFallback({ src, alt, ...rest }: ImageWithFallbackProps) {
  const [failed, setFailed] = useState(false)

  // Safety net: if src is an array (nested gallery), extract first string
  const raw = src as unknown
  const safeSrc = typeof raw === 'string'
    ? raw
    : Array.isArray(raw)
      ? ((raw as unknown[]).flat(2).find((img): img is string => typeof img === 'string' && Boolean(img)) ?? null)
      : null

  if (!safeSrc || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className="flex h-full w-full items-center justify-center bg-muted"
      >
        <PackageOpen className="size-8 text-muted-foreground" aria-hidden="true" />
      </div>
    )
  }

  return <Image src={safeSrc || "/placeholder.svg"} alt={alt} onError={() => setFailed(true)} {...rest} />
}
