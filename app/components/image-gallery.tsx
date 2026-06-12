'use client'

import { useState } from 'react'
import Image from 'next/image'

export function ImageGallery({ images, alt }: { images: string[]; alt: string }) {
  const validImages = images.filter(Boolean)
  const [active, setActive] = useState(0)

  if (validImages.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
        Kein Bild verfügbar
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
        <Image
          src={validImages[active] || '/placeholder.svg'}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          priority={active === 0}
        />
      </div>
      {validImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {validImages.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Bild ${i + 1} anzeigen`}
              aria-pressed={i === active}
              className={`relative size-16 shrink-0 overflow-hidden rounded-md border-2 ${
                i === active ? 'border-primary' : 'border-transparent'
              }`}
            >
              <Image src={src || '/placeholder.svg'} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
