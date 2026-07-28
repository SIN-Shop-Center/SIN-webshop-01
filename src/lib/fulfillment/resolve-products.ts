export type FulfillmentOrderItem = {
  product_id: string
  variant_id?: string | null
  quantity: number
}

export type FulfillmentProductRecord = {
  id: string
  cj_variant_id?: string | null
  variants?: unknown
}

export type ResolvedCjProduct = { vid: string; quantity: number }

export type ResolveCjProductsResult =
  | { ok: true; products: ResolvedCjProduct[] }
  | { ok: false; error: string }

function variantIdFrom(value: unknown): string {
  if (!value || typeof value !== 'object') return ''
  const record = value as Record<string, unknown>
  const candidate = record.cj_variant_id ?? record.vid
  return typeof candidate === 'string' ? candidate.trim() : ''
}

export function resolveCjOrderProducts(
  items: FulfillmentOrderItem[],
  products: FulfillmentProductRecord[],
): ResolveCjProductsResult {
  if (items.length === 0) return { ok: false, error: 'Order has no items' }

  const productsById = new Map(products.map((product) => [product.id, product]))
  const resolved: ResolvedCjProduct[] = []

  for (const item of items) {
    const product = productsById.get(item.product_id)
    if (!product) return { ok: false, error: `Product not found: ${item.product_id}` }

    const quantity = Number(item.quantity)
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return { ok: false, error: `Invalid quantity for product ${item.product_id}` }
    }

    let variantId = ''
    if (item.variant_id) {
      const variants = Array.isArray(product.variants) ? product.variants : []
      variantId = variants
        .map(variantIdFrom)
        .find((candidate) => candidate === item.variant_id) ?? ''
      if (!variantId) {
        return {
          ok: false,
          error: `Variant ${item.variant_id} is not valid for product ${item.product_id}`,
        }
      }
    } else {
      variantId = String(product.cj_variant_id || '').trim()
    }

    if (!variantId) {
      return { ok: false, error: `No CJ variant for product ${item.product_id}` }
    }

    resolved.push({ vid: variantId, quantity })
  }

  return { ok: true, products: resolved }
}
