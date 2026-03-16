import type { Metadata } from 'next'
import { SITE_NAME } from '@/lib/site'
import { getSeoProduct } from '@/lib/server/catalog'

type ProductLayoutProps = {
  children: React.ReactNode
  params: {
    id: string
  }
}

export async function generateMetadata({ params }: ProductLayoutProps): Promise<Metadata> {
  const product = await getSeoProduct(params.id)
  const canonicalPath = `/products/${encodeURIComponent(params.id)}`

  if (!product) {
    return {
      title: 'Produkt nicht gefunden',
      description: 'Dieses Produkt ist aktuell nicht im Sortiment. Im Katalog bleiben Preis, Lieferung und Rückgabe sichtbar.',
      alternates: {
        canonical: canonicalPath,
      },
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  const description =
    product.description || `${product.name} mit sichtbarem Preis, klarer Lieferung und transparenter Rückgabe bei ${SITE_NAME}.`
  const title = `${product.name} | ${SITE_NAME}`

  return {
    title: product.name,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      url: canonicalPath,
      type: 'website',
      images: [
        {
          url: product.image,
          alt: product.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [product.image],
    },
  }
}

export default function ProductLayout({ children }: ProductLayoutProps) {
  return children
}
