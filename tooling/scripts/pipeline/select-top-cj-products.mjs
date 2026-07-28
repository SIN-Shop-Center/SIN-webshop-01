#!/usr/bin/env node
/**
 * Select the daily top 10 CJ Dropshipping products from evidence-backed trends.
 * Products without verified EU stock or with blocked compliance risk are excluded.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { createClient } from '@supabase/supabase-js'
import { loadLocalEnvFiles } from '../lib/cli-env.mjs'

loadLocalEnvFiles()

const ROOT = process.cwd()
const DATA_DIR = path.join(ROOT, 'data', 'pipeline')
const TREND_FILE = path.join(DATA_DIR, 'trends-output.json')
const OUTPUT_FILE = path.join(DATA_DIR, 'cj-top-10.json')
const CJ_BASE = 'https://developers.cjdropshipping.com/api2.0/v1'
const TOP_TRENDS = Math.max(3, Math.min(30, Number(process.env.CJ_TREND_KEYWORD_LIMIT ?? 12)))
const PER_KEYWORD = Math.max(1, Math.min(10, Number(process.env.CJ_PRODUCTS_PER_KEYWORD ?? 3)))
const OUTPUT_LIMIT = Math.max(1, Math.min(50, Number(process.env.CJ_DAILY_PRODUCT_LIMIT ?? 10)))
const MULTIPLIER = Number(process.env.CJ_PRICE_MULTIPLIER ?? 2.5)
const EU_WAREHOUSES = new Set(['DE', 'EU', 'GB', 'FR', 'ES', 'IT', 'PL', 'CZ', 'NL', 'BE'])

const BLOCKED_TERMS = [
  'weapon', 'gun', 'knife', 'taser', 'firework', 'explosive', 'vape', 'cigarette',
  'nicotine', 'alcohol', 'cbd', 'thc', 'drug', 'medical device', 'prescription',
  'supplement', 'counterfeit', 'replica brand', 'adult toy',
]

const HIGH_REVIEW_TERMS = [
  'baby', 'child', 'kids', 'cosmetic', 'skin', 'beauty', 'food', 'battery', 'charger',
  'electrical', 'laser', 'helmet', 'protective', 'pet food',
]

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!process.env.CJ_EMAIL || !process.env.CJ_API_KEY) {
  throw new Error('CJ_EMAIL and CJ_API_KEY are required')
}

let control = null
let shop = null
if (supabaseUrl && serviceKey) {
  control = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
    db: { schema: 'public' },
  })
  shop = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
    db: { schema: 'shop' },
  })
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

function parseJsonMaybe(value, fallback = []) {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string') return fallback
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

function stripHtml(value = '') {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function hasCjk(value = '') {
  return /[\u3400-\u9fff\uf900-\ufaff]/u.test(value)
}

function complianceRisk(detail) {
  const haystack = `${detail.productNameEn || ''} ${detail.categoryName || ''} ${stripHtml(detail.description || '')}`.toLowerCase()
  if (BLOCKED_TERMS.some((term) => haystack.includes(term))) {
    return { level: 'blocked', penalty: 100, reason: 'Blocked or highly restricted category keyword' }
  }
  if (HIGH_REVIEW_TERMS.some((term) => haystack.includes(term))) {
    return { level: 'high', penalty: 20, reason: 'Category requires enhanced compliance review' }
  }
  return { level: 'medium', penalty: 5, reason: 'Standard product review required' }
}

function collectImages(detail, variants) {
  const productImages = parseJsonMaybe(detail.productImageSet)
  const variantImages = variants.map((variant) => variant.variantImage).filter(Boolean)
  return [...new Set([detail.productImage, ...productImages, ...variantImages].filter(Boolean))]
}

function qualityScore(detail, variants, images) {
  const title = String(detail.productNameEn || '')
  const description = stripHtml(detail.description || '')
  let score = 0
  if (title.length >= 8 && title.length <= 140) score += 22
  else if (title.length >= 4) score += 10
  if (!hasCjk(title)) score += 8
  if (description.length >= 300) score += 22
  else if (description.length >= 80) score += 12
  if (!hasCjk(description)) score += 8
  score += clamp(images.length * 5, 0, 25)
  score += clamp(variants.length * 3, 0, 15)
  return clamp(score)
}

function calculateRetail(costUsd) {
  const raw = Number(costUsd || 0) * MULTIPLIER
  return raw > 0 ? Number((Math.ceil(raw) - 0.01).toFixed(2)) : 0
}

function marginScore(cost, retail) {
  if (!(cost > 0) || !(retail > cost)) return 0
  const grossMargin = (retail - cost) / retail
  return clamp(grossMargin * 130)
}

async function getToken() {
  if (shop) {
    const { data } = await shop
      .from('cj_auth')
      .select('access_token, access_token_expires_at')
      .eq('id', 1)
      .maybeSingle()
    if (data?.access_token && new Date(data.access_token_expires_at).getTime() > Date.now() + 86_400_000) {
      return data.access_token
    }
  }

  const response = await fetch(`${CJ_BASE}/authentication/getAccessToken`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: process.env.CJ_EMAIL, password: process.env.CJ_API_KEY }),
  })
  const json = await response.json()
  if (!response.ok || !json.result) throw new Error(`CJ authentication failed: ${json.message || response.status}`)

  if (shop) {
    await shop.from('cj_auth').upsert({
      id: 1,
      access_token: json.data.accessToken,
      access_token_expires_at: new Date(json.data.accessTokenExpiryDate).toISOString(),
      refresh_token: json.data.refreshToken,
      updated_at: new Date().toISOString(),
    })
  }
  return json.data.accessToken
}

async function cj(token, endpoint, query = {}) {
  const url = new URL(`${CJ_BASE}${endpoint}`)
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
  }
  const response = await fetch(url, { headers: { 'CJ-Access-Token': token } })
  const json = await response.json()
  if (!response.ok || !(json.result ?? json.success)) {
    throw new Error(`CJ ${endpoint}: ${json.message || response.status}`)
  }
  return json.data
}

async function searchProducts(token, keyword) {
  const data = await cj(token, '/product/list', {
    productNameEn: keyword,
    pageNum: 1,
    pageSize: PER_KEYWORD,
    countryCode: 'DE',
  })
  return Array.isArray(data?.list) ? data.list : []
}

function inventoryRows(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.inventories)) return data.inventories
  if (Array.isArray(data?.list)) return data.list
  return []
}

function aggregateInventory(rows) {
  const byVariant = new Map()
  let total = 0
  for (const row of rows) {
    const country = String(row.countryCode || row.country || row.areaCode || row.areaEn || '').toUpperCase()
    if (!EU_WAREHOUSES.has(country) && ![...EU_WAREHOUSES].some((code) => country.includes(code))) continue
    const stock = Math.max(0, Number(row.storageNum ?? row.totalInventoryNum ?? row.inventoryNum ?? row.num ?? 0))
    const vid = String(row.vid || row.variantId || row.variant_id || 'unknown')
    total += stock
    byVariant.set(vid, (byVariant.get(vid) || 0) + stock)
  }
  return { total, byVariant: Object.fromEntries(byVariant) }
}

async function getVerifiedInventory(token, pid, variants) {
  try {
    const byProduct = await cj(token, '/product/stock/getInventoryByPid', { pid })
    const aggregate = aggregateInventory(inventoryRows(byProduct))
    if (aggregate.total > 0) return aggregate
  } catch (error) {
    console.warn(`Inventory-by-pid failed for ${pid}: ${error.message}`)
  }

  const rows = []
  for (const variant of variants.slice(0, 8)) {
    try {
      const data = await cj(token, '/product/stock/queryByVid', { vid: variant.vid })
      rows.push(...inventoryRows(data))
    } catch (error) {
      console.warn(`Inventory-by-vid failed for ${variant.vid}: ${error.message}`)
    }
    await sleep(350)
  }
  return aggregateInventory(rows)
}

async function evaluateProduct(token, trend, listing) {
  const detail = await cj(token, '/product/query', { pid: listing.pid })
  const variants = Array.isArray(detail?.variants) ? detail.variants : []
  if (!variants.length) return null
  const inventory = await getVerifiedInventory(token, detail.pid || listing.pid, variants)
  if (inventory.total <= 0) return null

  const images = collectImages(detail, variants)
  const cost = Math.min(
    ...variants
      .map((variant) => Number(variant.variantSellPrice ?? 0))
      .filter((value) => value > 0),
  )
  if (!Number.isFinite(cost) || cost <= 0) return null

  const retail = calculateRetail(cost)
  const quality = qualityScore(detail, variants, images)
  const risk = complianceRisk(detail)
  if (risk.level === 'blocked') return null

  const stockScore = clamp(Math.log10(inventory.total + 1) * 32)
  const margin = marginScore(cost, retail)
  const score = clamp(
    Number(trend.score || 0) * 0.35 +
      stockScore * 0.24 +
      quality * 0.23 +
      margin * 0.18 -
      risk.penalty,
  )

  return {
    rank_score: Number(score.toFixed(2)),
    trend_keyword: trend.keyword,
    trend_score: Number(trend.score || 0),
    trend_source: trend.source,
    trend_source_url: trend.source_url,
    cj_product_id: String(detail.pid || listing.pid),
    title: detail.productNameEn || listing.productNameEn,
    description_raw: stripHtml(detail.description || ''),
    category: detail.categoryName || listing.categoryName || null,
    source_url: `https://cjdropshipping.com/product/${detail.pid || listing.pid}`,
    cost_usd: Number(cost.toFixed(2)),
    recommended_retail_eur: retail,
    margin_score: Number(margin.toFixed(2)),
    quality_score: quality,
    risk_level: risk.level,
    risk_reason: risk.reason,
    eu_stock_total: inventory.total,
    eu_stock_by_variant: inventory.byVariant,
    delivery_time_hours: Number(detail.deliveryTime ?? listing.deliveryTime ?? 0) || null,
    images,
    variants: variants.map((variant) => ({
      cj_variant_id: String(variant.vid),
      sku: variant.variantSku || null,
      name: variant.variantKey || variant.variantNameEn || null,
      cost_usd: Number(variant.variantSellPrice ?? 0) || null,
      image_url: variant.variantImage || null,
      verified_eu_stock: Number(inventory.byVariant[String(variant.vid)] || 0),
    })),
    status: 'review_required',
    selected_at: new Date().toISOString(),
  }
}

async function ensureCjSupplier() {
  if (!control) return null
  const { data: existing, error: findError } = await control
    .from('suppliers')
    .select('id')
    .ilike('name', 'CJ%')
    .limit(1)
    .maybeSingle()
  if (findError) throw findError
  if (existing?.id) return existing.id

  const { data, error } = await control
    .from('suppliers')
    .insert({
      name: 'CJ Dropshipping',
      website: 'https://cjdropshipping.com',
      status: 'active',
      country: 'CN',
      fulfillment_mode: 'api',
      auto_fulfill_enabled: false,
      notes: 'Managed by commerce-autopilot; EU inventory required before approval.',
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

async function persistCatalog(products) {
  if (!control) return { upserted: 0, warning: 'Supabase env missing; JSON output only' }
  const supplierId = await ensureCjSupplier()
  const rows = products.map((product) => ({
    supplier_id: supplierId,
    external_product_id: product.cj_product_id,
    supplier_sku: product.variants[0]?.sku || null,
    title: product.title,
    description: product.description_raw || null,
    source_url: product.source_url,
    image_url: product.images[0] || null,
    currency: 'USD',
    price: product.cost_usd,
    compare_at_price: product.recommended_retail_eur,
    stock_hint: product.eu_stock_total,
    lead_time_days: product.delivery_time_hours
      ? Math.max(1, Math.ceil(product.delivery_time_hours / 24))
      : null,
    status: 'reviewing',
    review_note: product.risk_reason,
    ai_score: product.rank_score,
    metadata: product,
    last_seen_at: new Date().toISOString(),
  }))
  const { error } = await control
    .from('supplier_catalog_products')
    .upsert(rows, { onConflict: 'supplier_id,external_product_id' })
  if (error) throw error
  return { upserted: rows.length, supplier_id: supplierId }
}

async function main() {
  const report = JSON.parse(await fs.readFile(TREND_FILE, 'utf8'))
  const trends = (report.candidates || report)
    .filter((trend) => Number(trend.score || 0) >= Number(process.env.MIN_TREND_SCORE ?? 45))
    .slice(0, TOP_TRENDS)
  if (!trends.length) throw new Error('No trend candidates available for CJ selection')

  const token = await getToken()
  const evaluated = new Map()
  for (const trend of trends) {
    console.log(`Searching CJ for: ${trend.keyword}`)
    let listings = []
    try {
      listings = await searchProducts(token, trend.keyword)
    } catch (error) {
      console.warn(`Search failed for ${trend.keyword}: ${error.message}`)
      continue
    }

    for (const listing of listings) {
      if (evaluated.has(String(listing.pid))) continue
      try {
        const candidate = await evaluateProduct(token, trend, listing)
        if (candidate) {
          evaluated.set(candidate.cj_product_id, candidate)
          console.log(`  ${candidate.rank_score.toFixed(1)} · ${candidate.title} · EU stock ${candidate.eu_stock_total}`)
        } else {
          console.log(`  skipped ${listing.productNameEn || listing.pid}`)
        }
      } catch (error) {
        console.warn(`  evaluation failed ${listing.pid}: ${error.message}`)
      }
      await sleep(700)
    }
  }

  const selected = [...evaluated.values()]
    .sort((a, b) => b.rank_score - a.rank_score)
    .slice(0, OUTPUT_LIMIT)
    .map((product, index) => ({ ...product, rank: index + 1 }))

  if (!selected.length) {
    throw new Error('No CJ product passed EU stock, data and compliance gates')
  }

  await fs.mkdir(DATA_DIR, { recursive: true })
  const output = {
    generated_at: new Date().toISOString(),
    input_trends: trends.length,
    evaluated_products: evaluated.size,
    selection_count: selected.length,
    policy: {
      eu_stock_required: true,
      blocked_categories_excluded: true,
      human_review_required: true,
    },
    products: selected,
  }
  await fs.writeFile(OUTPUT_FILE, `${JSON.stringify(output, null, 2)}\n`)
  const persistence = await persistCatalog(selected)
  console.log(`Selected ${selected.length} products -> ${OUTPUT_FILE}`)
  console.log(`Database: ${JSON.stringify(persistence)}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
