#!/usr/bin/env node
/**
 * Importiert CJ-Produkte nach Supabase — inkl. ALLER Varianten und Bilder.
 * Usage:
 *   node scripts/cj/import-products.mjs --keyword "wireless earbuds" --limit 20
 *   node scripts/cj/import-products.mjs --pid <CJ_PRODUCT_ID>
 *
 * FIX (PDP-Daten): Vorher wurde nur die erste Varianten-ID gespeichert —
 * dadurch blieben VariantSelector und ImageGallery auf der Produktseite leer.
 * Jetzt: vollständiges variants-JSONB-Array + image_gallery text[].
 *
 * NOTE: CJ-Feldnamen (variants, variantSellPrice, productImageSet) gegen die
 * echte API-Response verifizieren. Beim ersten Test --limit 1 verwenden.
 */
import { createClient } from '@supabase/supabase-js'

const CJ_BASE = 'https://developers.cjdropshipping.com/api2.0/v1'
const MULTIPLIER = Number(process.env.CJ_PRICE_MULTIPLIER ?? '2.5')

const EU_WAREHOUSES = new Set(['DE', 'EU', 'GB', 'FR', 'ES', 'IT', 'PL', 'CZ'])

const args = process.argv.slice(2)
function arg(name) {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false }, db: { schema: 'shop' } },
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
  const raw = Number(costUsd) * MULTIPLIER
  return (Math.ceil(raw) - 0.01).toFixed(2)
}

/**
 * CJ-Variante → JSONB-Format, das parseVariants() in app/lib/queries.ts liest:
 * { cj_variant_id, sku, name, price, stock, image_url }
 */
function mapVariant(v) {
  const cost = Number(v.variantSellPrice ?? 0)
  return {
    cj_variant_id: String(v.vid),
    sku: v.variantSku ?? null,
    name: v.variantKey ?? v.variantNameEn ?? null,
    price: cost > 0 ? Number(calcPrice(cost)) : null,
    stock: Number(v.variantStock ?? 0) || 25, // Fallback bis Sync-Cron läuft
    image_url: v.variantImage ?? null,
  }
}

/** Bilder einsammeln: productImageSet + Varianten-Bilder, dedupliziert */
function collectImages(detail, variants) {
  const set = Array.isArray(detail.productImageSet)
    ? detail.productImageSet
    : typeof detail.productImageSet === 'string'
      ? (() => { try { return JSON.parse(detail.productImageSet) } catch { return [] } })()
      : []
  const variantImages = variants.map((v) => v.variantImage).filter(Boolean)
  return [...new Set([detail.productImage, ...set, ...variantImages].filter(Boolean))]
}

async function importProduct(pid) {
  const detail = await cj('/product/query', { pid })

  const cjVariants = detail.variants ?? []
  const firstVariant = cjVariants[0]
  if (!firstVariant) {
    console.warn(`Übersprungen (keine Varianten): ${detail.productNameEn}`)
    return
  }

  if (args.includes('--eu-only')) {
    const ok = await hasEuStock(firstVariant.vid)
    if (!ok) {
      console.warn(`Übersprungen (kein EU-Lager): ${detail.productNameEn}`)
      return
    }
  }

  const cost = Number(firstVariant.variantSellPrice ?? detail.sellPrice)
  const variants = cjVariants.map(mapVariant)
  const images = collectImages(detail, cjVariants)

  // Spaltennamen = echtes shop.products-Schema ('name', 'images' jsonb).
  // Die View products_v mappt sie auf 'title' / 'image_url' für den App-Code.
  // FIX: id ist UUID-Spalte → deterministische UUID v5 aus pid ableiten.
  //     UUID-namespace: cj-dropshipping (selbst definiert).
  const CJ_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
  const crypto = await import('node:crypto')
  const id = crypto.createHash('sha1').update(`cj:${detail.pid}`).digest('hex')
  const idUuid = `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20, 32)}`
  const row = {
    id: idUuid,
    name: detail.productNameEn,
    slug: `cj-${detail.pid}`,
    description:
      (detail.description ?? '').replace(/<[^>]*>/g, ' ').trim().slice(0, 2000) ||
      detail.productNameEn,
    price: calcPrice(cost),
    images: images, // jsonb-Array
    image_gallery: images, // text[] — von der View bevorzugt gelesen
    variants: variants, // jsonb — FIX: vorher nie gespeichert!
    stock: variants.reduce((sum, v) => sum + v.stock, 0) || 50,
    is_active: true,
    cj_product_id: detail.pid,
    cj_variant_id: firstVariant.vid,
    cj_sku: firstVariant.variantSku ?? detail.productSku,
    cj_cost_price: cost,
    cj_last_synced_at: new Date().toISOString(),
  }

  const { error } = await supabase.from('products').upsert(row, { onConflict: 'id' })
  if (error) throw error
  console.log(
    `Importiert: ${row.name} — ${variants.length} Varianten, ${images.length} Bilder (${cost} USD → ${row.price} EUR)`,
  )
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
      await new Promise((r) => setTimeout(r, 1100))
    } catch (e) {
      console.error(`Fehler bei ${p.pid}: ${e.message}`)
    }
  }
}
console.log('Fertig.')
