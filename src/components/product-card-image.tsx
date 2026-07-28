// Purpose: Product card image with hover swap to second gallery image
// Docs: AGENTS.md

import { ImageWithFallback } from '@/components/image-with-fallback'

export function ProductCardImage({
  images,
  alt,
}: {
  images: string[]
  alt: string
}) {
  // Ensure we're working with strings, not arrays
  const primary = Array.isArray(images[0]) ? images[0][0] : images[0]
  const secondary = Array.isArray(images[1]) ? images[1][0] : images[1]

  return (
    <>
      <ImageWithFallback
        src={primary || "/placeholder.svg"}
        alt={alt}
        fill
        sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        className={`object-cover transition-all duration-300 ${
          secondary
            ? 'group-hover:opacity-0'
            : 'group-hover:scale-105'
        }`}
      />
      {secondary && (
        <ImageWithFallback
          src={secondary || "/placeholder.svg"}
          alt=""
          aria-hidden
          fill
          sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
      )}
    </>
  )
}
