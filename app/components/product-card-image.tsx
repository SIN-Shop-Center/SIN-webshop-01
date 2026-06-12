// Purpose: Product card image with hover swap to second gallery image
// Docs: AGENTS.md

import Image from 'next/image'

export function ProductCardImage({
  images,
  alt,
}: {
  images: string[]
  alt: string
}) {
  const primary = images[0]
  const secondary = images[1]

  return (
    <>
      <Image
        src={primary || '/placeholder.svg'}
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
        <Image
          src={secondary || '/placeholder.svg'}
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
