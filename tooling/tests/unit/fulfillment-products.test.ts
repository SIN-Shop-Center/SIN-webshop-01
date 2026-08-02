import { describe, expect, it } from 'vitest'

import { resolveCjOrderProducts } from '@/lib/fulfillment/resolve-products'

describe('resolveCjOrderProducts', () => {
  it('maps multiple products and preserves quantities', () => {
    const result = resolveCjOrderProducts(
      [
        { product_id: 'p1', quantity: 2 },
        { product_id: 'p2', quantity: 3 },
      ],
      [
        { id: 'p1', cj_variant_id: 'cj-v1' },
        { id: 'p2', cj_variant_id: 'cj-v2' },
      ],
    )

    expect(result).toEqual({
      ok: true,
      products: [
        { vid: 'cj-v1', quantity: 2 },
        { vid: 'cj-v2', quantity: 3 },
      ],
    })
  })

  it('uses only the selected variant of a product', () => {
    const result = resolveCjOrderProducts(
      [{ product_id: 'p1', variant_id: 'blue-xl', quantity: 1 }],
      [
        {
          id: 'p1',
          cj_variant_id: 'default',
          variants: [
            { cj_variant_id: 'red-m' },
            { cj_variant_id: 'blue-xl' },
          ],
        },
      ],
    )

    expect(result).toEqual({
      ok: true,
      products: [{ vid: 'blue-xl', quantity: 1 }],
    })
  })

  it('fails the whole order when a selected variant is not verified', () => {
    const result = resolveCjOrderProducts(
      [
        { product_id: 'p1', variant_id: 'blue-xl', quantity: 1 },
        { product_id: 'p2', quantity: 1 },
      ],
      [
        { id: 'p1', variants: [{ cj_variant_id: 'red-m' }] },
        { id: 'p2', cj_variant_id: 'cj-v2' },
      ],
    )

    expect(result).toEqual({
      ok: false,
      error: 'Variant blue-xl is not valid for product p1',
    })
  })

  it('rejects invalid quantities instead of silently normalizing them', () => {
    expect(
      resolveCjOrderProducts(
        [{ product_id: 'p1', quantity: 0 }],
        [{ id: 'p1', cj_variant_id: 'cj-v1' }],
      ),
    ).toEqual({ ok: false, error: 'Invalid quantity for product p1' })
  })
})
