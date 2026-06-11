#!/usr/bin/env node
/**
 * Importiert CJ-Produkte nach Supabase.
 * Usage:
 *   node scripts/cj/import-products.mjs --keyword "wireless earbuds" --limit 20
 *   node scripts/cj/import-products.mjs --pid <CJ_PRODUCT_ID>
 *
 * NOTE: CJ-API-Feldnamen (variants, variantSellPrice, productImageSet) müssen
 * gegen die echte API-Response verifiziert werden — CJ-Doku und Realität
 * weichen gelegentlich ab. Beim ersten Test --limit 1 verwenden.
 */
import { createClient } from '@supabase/supabase-js'

const CJ_BASE = 'https://developers.cjdropshipping.com/api2.0/v1'
const MULTIPLIER = Number(process.env.CJ_PRICE_MULTIPLIER ?? '2.5')

// EU/DE-Lager-Codes — TikTok-DE-Versandfristen (siehe docs/SIN_TIKTOK_MASTER_PIPELINE.md).
// Produkte ohne EU-Lagerbestand werden übersprungen, wenn --eu-only gesetzt ist.
const EU_WAREHOUSES = new Set(['DE', 'EU', 'GB', 'FR', 'ES', 'IT', 'PL', 'CZ'])

const args = process.argv.slice(2)
function arg(name) {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
)

async function getToken() {
  const { data } = await supabase
    .from('cj_auth')
    .select('access_token, access_token_expires_at')
    .eq('id', 1)
    .maybeSingle()

  if (
    data?.access_token &&
    new Date(data.access_token_expires_at).getTime() - Date.now() > 24 * 3600 * 1000
  ) {
    return data.access_token
  }

  const res = await fetch(`${CJ_BASE}/authentication/getAccessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.CJ_EMAIL, password: process.env.CJ_API_KEY }),
  })
  const json = await res.json()
  if (!json.result) throw new Error(`CJ auth failed: ${json.message}`)

  await supabase.from('cj_auth').upsert({
    id: 1,
    access_token: json.data.accessToken,
    access_token_expires_at: new Date(json.data.accessTokenExpiryDate).toISOString(),
    refresh_token: json.data.refreshToken,
    updated_at: new Date().toISOString(),
  })
  return json.data.accessToken
}

async function cj(path, query = {}) {
  const token = await getToken()
  const url = new URL(`${CJ_BASE}${path}`)
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v)
  const res = await fetch(url, { headers: { 'CJ-Access-Token': token } })
  const json = await res.json()
  if (!json.result) throw new Error(`CJ error on ${path}: ${json.message}`)
  return json.data
}

async function hasEuStock(vid) {
  try {
    const data = await cj('/product/stock/queryByVid', { vid })
    const list = Array.isArray(data) ? data : []
    return list.some(
      (w) =>
        EU_WAREHOUSES.has(String(w.countryCode || w.areaEn || '').toUpperCase()) &&
        Number(w.storageNum ?? w.num ?? 0) > 0,
    )
  } catch {
    return false
  }
}

function calcPrice(costUsd) {
  // CJ-Preise sind USD. Vereinfachung: 1:1 als EUR-Basis behandeln und
  // Marge draufschlagen. Bei Bedarf hier echten Wechselkurs einbauen.
  const raw = Number(costUsd) * MULTIPLIER
  return (Math.ceil(raw) - 0.01).toFixed(2) // psychologischer Preis x.99
}

async function importProduct(pid) {
  // Produktdetails inkl. Varianten
  const detail = await cj('/product/query', { pid })

  const variants = detail.variants ?? []
  const firstVariant = variants[0]
  if (!firstVariant) {
    console.warn(`Übersprungen (keine Varianten): ${detail.productNameEn}`)
    return
  }

  // EU-Warehouse-Filter (TikTok-DE-Versandfristen)
  if (args.includes('--eu-only')) {
    const ok = await hasEuStock(firstVariant.vid)
    if (!ok) {
      console.warn(`Übersprungen (kein EU-Lager): ${detail.productNameEn}`)
      return
    }
  }

  const cost = Number(firstVariant.variantSellPrice ?? detail.sellPrice)
  const images = Array.isArray(detail.productImageSet) ? detail.productImageSet : [detail.productImage]

  const row = {
    id: `cj-${detail.pid}`,
    title: detail.productNameEn,
    description: (detail.description ?? '').replace(/<[^>]*>/g, ' ').trim().slice(0, 2000) || detail.productNameEn,
    price: calcPrice(cost),
    category: detail.categoryName?.split('/')[0]?.trim() ?? 'Allgemein',
    image_url: images[0],
    image_gallery: images,
    stock: 50, // wird vom Sync-Cron mit echtem CJ-Bestand überschrieben
    is_featured: false,
    cj_product_id: detail.pid,
    cj_variant_id: firstVariant.vid,
    cj_sku: firstVariant.variantSku ?? detail.productSku,
    cj_cost_price: cost,
    cj_last_synced_at: new Date().toISOString(),
  }

  const { error } = await supabase.from('products').upsert(row, { onConflict: 'id' })
  if (error) throw error
  console.log(`Importiert: ${row.title} (${cost} USD Einkauf → ${row.price} EUR Verkauf)`)
}

const pid = arg('pid')
if (pid) {
  await importProduct(pid)
} else {
  const keyword = arg('keyword')
  const limit = Number(arg('limit') ?? '10')
  if (!keyword) {
    console.error(
      'Usage: --keyword "suchbegriff" [--limit 10] [--eu-only] ODER --pid <id> [--eu-only]',
    )
    process.exit(1)
  }
  const data = await cj('/product/list', {
    productNameEn: keyword,
    pageSize: String(limit),
    countryCode: 'CN',
  })
  console.log(`${data.total} Treffer, importiere ${data.list.length}...`)
  for (const p of data.list) {
    try {
      await importProduct(p.pid)
      await new Promise((r) => setTimeout(r, 1100)) // CJ Rate-Limit schonen
    } catch (e) {
      console.error(`Fehler bei ${p.pid}: ${e.message}`)
    }
  }
}
console.log('Fertig.')
