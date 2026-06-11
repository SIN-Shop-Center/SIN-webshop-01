// Purpose: E2E Inventory-Race-Test (#32 für #37)
// Docs: reserve_stock ist atomar — zwei parallele Reservierungen für das
// letzte 1-Stück-Produkt dürfen nicht beide erfolgreich sein.
//
// Test-Strategie:
//   1. Hole ein Produkt mit niedrigem Stock (oder erstelle Test-Produkt)
//   2. Rufe reserve_stock(qty=stock) zweimal parallel auf
//   3. Erwarte: 1× success, 1× P0001 (stock exhausted)
//
// Cleanup: am Ende stock zurücksetzen.

import { describe, it, expect } from 'vitest'
import { createAdminClient } from '@/app/lib/supabase/admin'

const admin = createAdminClient()

const TEST_PRODUCT_SLUG = '__e2e_race_test_product__'

async function ensureTestProduct(stock: number): Promise<string> {
  // Cleanup alte Reste
  await admin.from('products').delete().eq('slug', TEST_PRODUCT_SLUG)

  const { data, error } = await admin
    .from('products')
    .insert({
      slug: TEST_PRODUCT_SLUG,
      name: 'E2E Race Test',
      description: 'temporäres Test-Produkt',
      price: 9.99,
      stock,
      is_active: true,
      images: [],
    })
    .select('id')
    .single()
  if (error || !data) throw new Error(`Failed to create test product: ${error?.message}`)
  return data.id
}

describe('Inventory Race-Condition (#37)', () => {
  it('1. reserve_stock(qty=1) auf Produkt mit stock=1: 1× success, 1× P0001', async () => {
    const productId = await ensureTestProduct(1)

    try {
      // Zwei parallele Reservierungen
      const results = await Promise.all([
        admin.rpc('reserve_stock', { p_product_id: productId, p_qty: 1 }),
        admin.rpc('reserve_stock', { p_product_id: productId, p_qty: 1 }),
      ])

      // Supabase JS RPC: 
      //   success: true + data: { new_stock } = ok
      //   success: false + error: {code: 'P0001', ...} = stock exhausted
      //   success: false + error: {code: 'P0002', ...} = invalid qty
      const ok = results.filter((r) => r.success === true)
      const exhausted = results.filter((r) => r.success === false && r.error?.code === 'P0001')

      expect(ok).toHaveLength(1)
      expect(exhausted).toHaveLength(1)
    } finally {
      // Cleanup
      await admin.from('products').delete().eq('id', productId)
    }
  }, 30_000)

  it('2. reserve_stock mit p_qty=0: P0002 (invalid quantity)', async () => {
    const productId = await ensureTestProduct(10)
    try {
      const { error } = await admin.rpc('reserve_stock', {
        p_product_id: productId,
        p_qty: 0,
      })
      expect(error?.code).toBe('P0002')
    } finally {
      await admin.from('products').delete().eq('id', productId)
    }
  }, 10_000)

  it('3. reserve_stock mit p_qty>99: P0002 (over-limit)', async () => {
    const productId = await ensureTestProduct(100)
    try {
      const { error } = await admin.rpc('reserve_stock', {
        p_product_id: productId,
        p_qty: 100,
      })
      expect(error?.code).toBe('P0002')
    } finally {
      await admin.from('products').delete().eq('id', productId)
    }
  }, 10_000)

  it('4. release_stock gibt reservierten Stock wieder frei', async () => {
    const productId = await ensureTestProduct(5)
    try {
      await admin.rpc('reserve_stock', { p_product_id: productId, p_qty: 2 })
      const { data: afterReserve } = await admin
        .from('products')
        .select('stock')
        .eq('id', productId)
        .single()
      expect(afterReserve?.stock).toBe(3)

      await admin.rpc('release_stock', { p_product_id: productId, p_qty: 2 })
      const { data: afterRelease } = await admin
        .from('products')
        .select('stock')
        .eq('id', productId)
        .single()
      expect(afterRelease?.stock).toBe(5)
    } finally {
      await admin.from('products').delete().eq('id', productId)
    }
  }, 15_000)
})
