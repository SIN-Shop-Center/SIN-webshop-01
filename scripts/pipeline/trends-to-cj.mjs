// Purpose: Brücke Stufe 1 → 2 — Trend-Kandidaten aus dem Intelligence-Bundle
// in CJ-Produktsuche übersetzen und Import-Kandidaten als Review-Liste ausgeben.
// Docs: docs/SIN_TIKTOK_MASTER_PIPELINE.md
//
// Aufruf: node scripts/pipeline/trends-to-cj.mjs ./trends-output.json
// Output: ./cj-candidates.json — manuell reviewen, dann mit
//   node scripts/cj/import-products.mjs --from cj-candidates.json importieren.

import { readFileSync, writeFileSync } from 'node:fs'

const CJ_BASE = 'https://developers.cjdropshipping.com/api2.0/v1'
const MIN_TREND_SCORE = Number(process.env.MIN_TREND_SCORE ?? '60')
const MAX_PRODUCTS_PER_KEYWORD = 5

async function getCjToken() {
  const res = await fetch(`${CJ_BASE}/authentication/getAccessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.CJ_EMAIL,
      password: process.env.CJ_API_KEY,
    }),
  })
  const json = await res.json()
  if (!json.result) throw new Error(`CJ auth failed: ${json.message}`)
  return json.data.accessToken
}

async function searchCjProducts(token, keyword) {
  const url = new URL(`${CJ_BASE}/product/list`)
  url.searchParams.set('productNameEn', keyword)
  url.searchParams.set('pageSize', String(MAX_PRODUCTS_PER_KEYWORD))
  url.searchParams.set('countryCode', 'DE')

  const res = await fetch(url, { headers: { 'CJ-Access-Token': token } })
  const json = await res.json()
  return json.result ? (json.data?.list ?? []) : []
}

async function main() {
  const inputPath = process.argv[2] ?? './trends-output.json'
  const trends = JSON.parse(readFileSync(inputPath, 'utf8'))

  const candidates = trends
    .filter((t) => Number(t.score ?? 0) >= MIN_TREND_SCORE)
    .sort((a, b) => b.score - a.score)

  console.log(`${candidates.length} Trends über Score ${MIN_TREND_SCORE}`)

  const token = await getCjToken()
  const output = []

  for (const trend of candidates) {
    const products = await searchCjProducts(token, trend.keyword)
    for (const p of products) {
      output.push({
        trend_keyword: trend.keyword,
        trend_score: trend.score,
        cj_product_id: p.pid,
        title: p.productNameEn,
        cost_usd: p.sellPrice,
        image: p.productImage,
        category: p.categoryName,
        approved: false,
        notes: '',
      })
    }
    console.log(`  ${trend.keyword}: ${products.length} CJ-Treffer`)
    await new Promise((r) => setTimeout(r, 1500))
  }

  writeFileSync('./cj-candidates.json', JSON.stringify(output, null, 2))
  console.log(`\n${output.length} Kandidaten → ./cj-candidates.json`)
  console.log('Nächster Schritt: approved=true setzen, dann import-products.mjs ausführen.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
