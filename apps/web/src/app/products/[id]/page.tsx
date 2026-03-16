'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from '@/components/ui/Link'
import { useParams } from 'next/navigation'
import { ProductDetailSkeleton } from '@/components/products/ProductSkeleton'
import { JsonLd } from '@/components/seo/JsonLd'
import {
  ProductComparisonSection,
  ProductInfoPanel,
  ProductMediaPanel,
  ProductShelfSection,
  ProductUnavailableState,
  getProductCategory,
  getProductDiscount,
  useProductDetail,
} from '@/features/product'
import { getRecentlyViewedProducts } from '@/features/catalog'
import { useCustomerSegmentStore } from '@/features/segment'
import { trackEvent } from '@/lib/analytics'
import { useExperimentVariant } from '@/lib/experiments'
import { buildBreadcrumbJsonLd, buildProductJsonLd, buildProductListJsonLd } from '@/lib/seo'
import { useCartStore, useCommerceStore } from '@/lib/store'
function getMaxSelectableQuantity(stock: number | undefined, inStock: boolean | undefined): number {
  if (inStock === false) {
    return 0
  }
  if (typeof stock === 'number' && Number.isFinite(stock)) {
    return stock > 0 ? Math.floor(stock) : 0
  }
  return 999
}
export default function ProductDetailPage() {
  const params = useParams<{ id?: string | string[] }>()
  const rawProductId = params?.id
  const productId = Array.isArray(rawProductId) ? rawProductId[0] || '' : rawProductId || ''
  const addItem = useCartStore((state) => state.addItem)
  const compareIds = useCommerceStore((state) => state.compareIds)
  const clearComparedProducts = useCommerceStore((state) => state.clearComparedProducts)
  const recordViewedProduct = useCommerceStore((state) => state.recordViewedProduct)
  const recentlyViewedIds = useCommerceStore((state) => state.recentlyViewedIds)
  const toggleCompareProduct = useCommerceStore((state) => state.toggleCompareProduct)
  const segment = useCustomerSegmentStore((state) => state.segment)
  const { product, catalogProducts, related, compareCandidates, bundleCandidates, loading, error } = useProductDetail(productId)
  const ctaVariant = useExperimentVariant({
    experimentId: 'pdp_cta_copy_v1',
    variants: ['control', 'benefit'] as const,
  })
  const trustVariant = useExperimentVariant({
    experimentId: 'pdp_trust_position_v1',
    variants: ['after_cta', 'before_cta'] as const,
  })
  const [quantity, setQuantity] = useState(1)
  const maxSelectableQuantity = useMemo(
    () => getMaxSelectableQuantity(product?.stock, product?.inStock),
    [product?.inStock, product?.stock],
  )
  const category = useMemo(() => (product ? getProductCategory(product) : null), [product])
  const discount = useMemo(() => (product ? getProductDiscount(product) : null), [product])
  const productJsonLd = useMemo(() => (product ? buildProductJsonLd(product) : null), [product])
  const relatedJsonLd = useMemo(
    () => (related.length > 0 ? buildProductListJsonLd(related, 'Passende Produkte', `/products/${encodeURIComponent(productId)}`) : null),
    [productId, related],
  )
  const breadcrumbJsonLd = useMemo(
    () =>
      product
        ? buildBreadcrumbJsonLd([
            { name: 'Start', path: '/' },
            { name: 'Produkte', path: '/products' },
            { name: product.name, path: `/products/${encodeURIComponent(product.id)}` },
          ])
        : null,
    [product],
  )
  const recentlyViewedProducts = useMemo(() => {
    if (!product) {
      return []
    }
    return getRecentlyViewedProducts(
      catalogProducts.filter((item) => item.id !== product.id),
      recentlyViewedIds.filter((id) => id !== product.id),
      4,
    )
  }, [catalogProducts, product, recentlyViewedIds])

  useEffect(() => {
    setQuantity((current) => {
      if (maxSelectableQuantity < 1) {
        return 1
      }
      return Math.min(Math.max(1, current), maxSelectableQuantity)
    })
  }, [maxSelectableQuantity, product?.id])

  useEffect(() => {
    if (!product) {
      return
    }
    recordViewedProduct(product.id)
    void trackEvent('view_product', {
      payload: {
        product_id: product.id,
        category_id: product.categoryId,
        price: product.price,
      },
    })
  }, [product, recordViewedProduct])

  const addToCart = () => {
    if (!product || maxSelectableQuantity < 1) {
      return
    }
    const safeQuantity = Math.min(Math.max(1, Math.floor(quantity)), maxSelectableQuantity)
    setQuantity(safeQuantity)

    addItem(
      {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.images[0],
      },
      safeQuantity,
    )

    void trackEvent('add_to_cart', {
      payload: {
        product_id: product.id,
        quantity: safeQuantity,
        price: product.price,
        segment,
      },
    })
  }

  if (loading) {
    return (
      <main className="shell-container py-10" aria-busy="true">
        <h1 className="sr-only">Produkt wird geladen</h1>
        <ProductDetailSkeleton />
      </main>
    )
  }

  if (!product || !category) {
    return (
      <main className="shell-container py-14">
        <h1 className="sr-only">Produkt nicht verfügbar</h1>
        <ProductUnavailableState error={Boolean(error)} />
      </main>
    )
  }

  return (
    <main className="shell-container py-10">
      {productJsonLd ? <JsonLd id="pdp-product-jsonld" data={productJsonLd} /> : null}
      {breadcrumbJsonLd ? <JsonLd id="pdp-breadcrumb-jsonld" data={breadcrumbJsonLd} /> : null}
      {relatedJsonLd ? <JsonLd id="pdp-related-jsonld" data={relatedJsonLd} /> : null}

      <nav className="mb-5 flex flex-wrap items-center gap-1 text-sm text-brand-text-muted" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand-text">Start</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-brand-text">Produkte</Link>
        <span>/</span>
        <span className="text-brand-text">{product.name}</span>
      </nav>

      <section className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr]">
        <ProductMediaPanel product={product} discount={discount} />
        <ProductInfoPanel
          categoryName={category.name}
          product={product}
          segment={segment}
          quantity={quantity}
          maxQuantity={maxSelectableQuantity}
          ctaLabel={ctaVariant === 'benefit' ? 'Sicher kaufen und liefern lassen' : 'In den Warenkorb'}
          trustFirst={trustVariant === 'before_cta'}
          onQuantityChange={setQuantity}
          onAddToCart={addToCart}
        />
      </section>

      <ProductComparisonSection
        currentProduct={product}
        products={compareCandidates}
        compareIds={compareIds}
        onToggleCompare={toggleCompareProduct}
        onClearCompare={clearComparedProducts}
      />

      <ProductShelfSection
        eyebrow="Oft sinnvoll zusammen"
        title="Ergänze dein Setup ohne Umweg"
        description="Sekundäre Produkte bleiben sichtbar, ohne den Hauptkauf zu überlagern."
        products={bundleCandidates}
        columns={3}
      />

      <ProductShelfSection
        eyebrow="Passend zu diesem Produkt"
        title="Ähnliche Optionen für denselben Bedarf"
        description="Falls du noch zwischen mehreren Lösungen schwankst, bleiben hier Preis, Lieferung und Nutzen vergleichbar."
        products={related}
        columns={4}
      />

      <ProductShelfSection
        eyebrow="Wieder aufnehmen"
        title="Zuletzt angesehene Produkte"
        description="Du kannst den Entscheidungsfaden wieder aufnehmen, ohne neu suchen zu müssen."
        products={recentlyViewedProducts}
        columns={4}
      />
    </main>
  )
}
