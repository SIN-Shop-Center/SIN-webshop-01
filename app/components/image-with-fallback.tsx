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

  if (!src || failed) {
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

  return <Image src={src || "/placeholder.svg"} alt={alt} onError={() => setFailed(true)} {...rest} />
}
