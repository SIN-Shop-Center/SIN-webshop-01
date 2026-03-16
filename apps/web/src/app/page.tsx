import { HomePageClient } from './HomePageClient'
import { getInitialCatalogProducts } from '@/lib/server/catalog-list'

export default async function HomePage() {
  const initialProducts = await getInitialCatalogProducts(24)
  return <HomePageClient initialProducts={initialProducts} />
}
