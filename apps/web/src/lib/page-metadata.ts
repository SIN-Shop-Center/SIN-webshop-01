import type { Metadata } from 'next'
import { SITE_NAME, SITE_DESCRIPTION } from '@/lib/site'

type MetadataInput = {
  title: string
  description?: string
  path?: string
  noIndex?: boolean
}

export function buildPageMetadata({ title, description, path, noIndex = false }: MetadataInput): Metadata {
  const resolvedDescription = description || SITE_DESCRIPTION
  const canonical = path || undefined
  const fullTitle = `${title} | ${SITE_NAME}`

  return {
    title,
    description: resolvedDescription,
    alternates: canonical
      ? {
          canonical,
        }
      : undefined,
    robots: noIndex
      ? {
          index: false,
          follow: false,
        }
      : undefined,
    openGraph: {
      title: fullTitle,
      description: resolvedDescription,
      url: canonical || '/',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: resolvedDescription,
    },
  }
}
