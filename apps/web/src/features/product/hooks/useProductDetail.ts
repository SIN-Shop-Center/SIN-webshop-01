import { useEffect, useState } from 'react'
import { getBundleCandidates, getCompareCandidates, loadCatalogProductById, loadCatalogProducts } from '@/features/catalog'
import type { Product } from '@/types'

type ProductDetailState = {
  product: Product | null
  catalogProducts: Product[]
  related: Product[]
  compareCandidates: Product[]
  bundleCandidates: Product[]
  loading: boolean
  error: string | null
}

const INITIAL_STATE: ProductDetailState = {
  product: null,
  catalogProducts: [],
  related: [],
  compareCandidates: [],
  bundleCandidates: [],
  loading: true,
  error: null,
}

export function useProductDetail(productId: string) {
  const [state, setState] = useState<ProductDetailState>(INITIAL_STATE)

  useEffect(() => {
    let active = true

    const run = async () => {
      if (!productId) {
        setState({
          product: null,
          catalogProducts: [],
          related: [],
          compareCandidates: [],
          bundleCandidates: [],
          loading: false,
          error: 'missing_product_id',
        })
        return
      }

      setState(INITIAL_STATE)

      try {
        const loadedProduct = await loadCatalogProductById(productId)
        if (!active) {
          return
        }

        if (!loadedProduct) {
          setState({
            product: null,
            catalogProducts: [],
            related: [],
            compareCandidates: [],
            bundleCandidates: [],
            loading: false,
            error: null,
          })
          return
        }

        const catalogProducts = await loadCatalogProducts({ limit: 120 })
        if (!active) {
          return
        }

        const siblingProducts = catalogProducts.filter((item) => item.categoryId === loadedProduct.categoryId)

        setState({
          product: loadedProduct,
          catalogProducts,
          related: siblingProducts.filter((item) => item.id !== loadedProduct.id).slice(0, 4),
          compareCandidates: getCompareCandidates(catalogProducts, loadedProduct, 3),
          bundleCandidates: getBundleCandidates(catalogProducts, loadedProduct, 3),
          loading: false,
          error: null,
        })
      } catch {
        if (!active) {
          return
        }
        setState({
          product: null,
          catalogProducts: [],
          related: [],
          compareCandidates: [],
          bundleCandidates: [],
          loading: false,
          error: 'product_detail_load_failed',
        })
      }
    }

    void run()

    return () => {
      active = false
    }
  }, [productId])

  return state
}
