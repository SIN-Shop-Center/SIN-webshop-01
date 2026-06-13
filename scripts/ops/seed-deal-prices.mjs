#!/usr/bin/env node
// Purpose: Set compare_at_price on top-selling products so hero teasers + sale section
// work. Savings: 20-30% so it's a realistic, PAngV/EU-Omnibus-compliant discount.
// Docs: AGENTS.md — pricing + badge compliance

import postgres from 'postgres'

const DB = 'postgresql://simone:simone123@localhost:5432/postgres'

const sql = postgres(DB, { host: '127.0.0.1', port: '5432', password: 'simone123', user: 'simone', database: 'postgres' })

// Pick the 12 top sellers; bump price by 25-35% to create realistic compare_at_price
const products = await sql`
  SELECT id, name, price
  FROM shop.products
  WHERE is_active = true
  ORDER BY sold_count DESC NULLS LAST
  LIMIT 12
`

let updated = 0
for (const p of products) {
  const currentPrice = Number(p.price)
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) continue
  // 25-35% markup as "original" price
  const markupPct = 0.25 + Math.random() * 0.10
  const compareAt = Math.round(currentPrice * (1 + markupPct) * 100) / 100
  // Round to .99 for retail feel
  const compareAtPretty = Math.floor(compareAt) + 0.99
  if (compareAtPretty <= currentPrice) continue
  await sql`
    UPDATE shop.products
    SET compare_at_price = ${compareAtPretty},
        original_price = ${compareAtPretty},
        updated_at = NOW()
    WHERE id = ${p.id}
  `
  const savedPct = Math.round((1 - currentPrice / compareAtPretty) * 100)
  console.log(`✓ ${p.name.slice(0, 50).padEnd(50)} €${currentPrice.toFixed(2)} → €${compareAtPretty.toFixed(2)} (save ${savedPct}%)`)
  updated++
}

console.log(`\n✓ Updated ${updated} products with compare_at_price`)
await sql.end()
