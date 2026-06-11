// Purpose: Manual debug of the inventory race
import { createAdminClient } from '@/app/lib/supabase/admin'
import { readFileSync, existsSync } from 'node:fs'

if (existsSync('.env.local')) {
  const content = readFileSync('.env.local', 'utf-8')
  for (const line of content.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/)
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
}

async function main() {
  const admin = createAdminClient()
  const { data: products } = await admin
    .from('products')
    .select('id, stock')
    .eq('slug', '__e2e_race_test_product__')
    .single()

  if (!products) {
    console.log('no product found')
    return
  }

  console.log('Initial state:', products)

  const results = await Promise.allSettled([
    admin.rpc('reserve_stock', {
      p_product_id: products.id,
      p_qty: 1,
    }),
    admin.rpc('reserve_stock', {
      p_product_id: products.id,
      p_qty: 1,
    }),
  ])

  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    console.log(`Call ${i + 1}:`, r.status, r.status === 'fulfilled' ? r.value : r.reason)
  }

  const { data: after } = await admin
    .from('products')
    .select('stock')
    .eq('id', products.id)
    .single()
  console.log('After:', after)
}

main()
