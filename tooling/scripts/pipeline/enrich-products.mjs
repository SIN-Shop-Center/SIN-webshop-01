#!/usr/bin/env node
/**
 * Research and enrich CJ candidates with cited web evidence.
 *
 * Provider options:
 *  1. OPENAI_API_KEY -> OpenAI Responses API + web_search tool
 *  2. PRODUCT_RESEARCH_ENDPOINT -> custom HTTPS research service
 *
 * No provider means a hard failure. The pipeline never fabricates missing facts.
 */
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { createClient } from '@supabase/supabase-js'
import { loadLocalEnvFiles } from '../lib/cli-env.mjs'

loadLocalEnvFiles()

const ROOT = process.cwd()
const DATA_DIR = path.join(ROOT, 'data', 'pipeline')
const INPUT_FILE = path.join(DATA_DIR, 'cj-top-10.json')
const OUTPUT_FILE = path.join(DATA_DIR, 'enriched-products.json')
const MODEL = process.env.OPENAI_ENRICHMENT_MODEL || 'gpt-5'
const MULTIPLIER = Number(process.env.CJ_PRICE_MULTIPLIER ?? 2.5)
const MAX_PRODUCTS = Math.max(1, Math.min(20, Number(process.env.ENRICHMENT_PRODUCT_LIMIT ?? 10)))

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
}

const shop = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
  db: { schema: 'shop' },
})
const control = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
  db: { schema: 'public' },
})

const ENRICHMENT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'title_de', 'short_title_de', 'description_de', 'selling_points', 'specifications',
    'seo_title', 'seo_description', 'category_suggestion', 'manufacturer',
    'safety_notes', 'prohibited_claims', 'source_urls', 'confidence',
    'image_prompts', 'ugc_hooks', 'review_notes',
  ],
  properties: {
    title_de: { type: 'string' },
    short_title_de: { type: 'string' },
    description_de: { type: 'string' },
    selling_points: { type: 'array', items: { type: 'string' } },
    specifications: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'value', 'source_url'],
        properties: {
          name: { type: 'string' },
          value: { type: 'string' },
          source_url: { type: ['string', 'null'] },
        },
      },
    },
    seo_title: { type: 'string' },
    seo_description: { type: 'string' },
    category_suggestion: { type: 'string' },
    manufacturer: {
      type: 'object',
      additionalProperties: false,
      required: ['name', 'address', 'email', 'phone', 'source_url', 'verified'],
      properties: {
        name: { type: ['string', 'null'] },
        address: { type: ['string', 'null'] },
        email: { type: ['string', 'null'] },
        phone: { type: ['string', 'null'] },
        source_url: { type: ['string', 'null'] },
        verified: { type: 'boolean' },
      },
    },
    safety_notes: { type: 'array', items: { type: 'string' } },
    prohibited_claims: { type: 'array', items: { type: 'string' } },
    source_urls: { type: 'array', items: { type: 'string' } },
    confidence: { type: 'number', minimum: 0, maximum: 100 },
    image_prompts: { type: 'array', items: { type: 'string' } },
    ugc_hooks: { type: 'array', items: { type: 'string' } },
    review_notes: { type: 'array', items: { type: 'string' } },
  },
}

function productUuid(cjProductId) {
  const hash = crypto.createHash('sha1').update(`cj:${cjProductId}`).digest('hex')
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`
}

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)
}

function retailPrice(cost) {
  const raw = Number(cost || 0) * MULTIPLIER
  return raw > 0 ? Number((Math.ceil(raw) - 0.01).toFixed(2)) : 0
}

function validHttpsUrls(values) {
  return [...new Set((values || []).filter((value) => {
    try {
      return new URL(value).protocol === 'https:'
    } catch {
      return false
    }
  }))]
}

function extractResponseText(response) {
  let text = ''
  const citations = []
  for (const item of response.output || []) {
    if (item.type !== 'message') continue
    for (const content of item.content || []) {
      if (content.type === 'output_text') {
        text += content.text || ''
        for (const annotation of content.annotations || []) {
          const url = annotation.url || annotation.url_citation?.url
          const title = annotation.title || annotation.url_citation?.title
          if (url) citations.push({ url, title: title || null })
        }
      }
    }
  }
  return { text, citations }
}

async function researchWithOpenAI(product) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      store: false,
      tools: [{ type: 'web_search' }],
      instructions: [
        'You are a German ecommerce product research and compliance editor.',
        'Research the exact physical product using the supplied CJ product ID, title, images, category and source URL.',
        'Use web search. Only include product facts supported by accessible sources.',
        'Never infer or invent manufacturer, certifications, materials, dimensions, compatibility, safety claims or performance claims.',
        'If the exact manufacturer cannot be verified, return null fields and verified=false.',
        'Write natural German copy without hype, fake scarcity, unverifiable superlatives, medical claims or trademark misuse.',
        'The description must be useful and at least 300 characters when evidence allows it.',
        'Source URLs must directly support the returned facts. CJ can be one source but is not sufficient alone for manufacturer verification.',
        'Image prompts must preserve the exact product shape, color and visible features from the supplied images and must not invent accessories.',
      ].join('\n'),
      input: JSON.stringify({
        task: 'Enrich this product for a German dropshipping store while preserving uncertainty.',
        product,
      }),
      text: {
        format: {
          type: 'json_schema',
          name: 'product_enrichment',
          strict: true,
          schema: ENRICHMENT_SCHEMA,
        },
      },
    }),
  })

  const json = await response.json()
  if (!response.ok) {
    throw new Error(`OpenAI Responses API ${response.status}: ${json.error?.message || JSON.stringify(json)}`)
  }
  const extracted = extractResponseText(json)
  if (!extracted.text) throw new Error('OpenAI returned no structured output text')
  const result = JSON.parse(extracted.text)
  return {
    ...result,
    source_urls: validHttpsUrls([
      ...(result.source_urls || []),
      ...extracted.citations.map((citation) => citation.url),
    ]),
    citation_metadata: extracted.citations,
    research_provider: 'openai_responses_web_search',
    research_model: MODEL,
  }
}

async function researchWithCustomEndpoint(product) {
  const endpoint = process.env.PRODUCT_RESEARCH_ENDPOINT
  if (!/^https:\/\//i.test(endpoint || '')) {
    throw new Error('PRODUCT_RESEARCH_ENDPOINT must use HTTPS')
  }
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(process.env.PRODUCT_RESEARCH_TOKEN
        ? { authorization: `Bearer ${process.env.PRODUCT_RESEARCH_TOKEN}` }
        : {}),
    },
    body: JSON.stringify({ product, schema: ENRICHMENT_SCHEMA, locale: 'de-DE' }),
  })
  const json = await response.json()
  if (!response.ok) throw new Error(`Research endpoint ${response.status}: ${JSON.stringify(json)}`)
  const result = json.result || json.data || json
  return {
    ...result,
    source_urls: validHttpsUrls(result.source_urls),
    research_provider: 'custom_research_endpoint',
    research_model: json.model || null,
  }
}

async function researchProduct(product) {
  if (process.env.PRODUCT_RESEARCH_ENDPOINT) return researchWithCustomEndpoint(product)
  if (process.env.OPENAI_API_KEY) return researchWithOpenAI(product)
  throw new Error(
    'No research provider configured. Set OPENAI_API_KEY or PRODUCT_RESEARCH_ENDPOINT; synthetic enrichment is disabled.',
  )
}

function calculateQuality(product, enrichment) {
  let score = 0
  if (enrichment.title_de?.length >= 10) score += 12
  if (enrichment.description_de?.length >= 300) score += 20
  if ((enrichment.selling_points || []).length >= 3) score += 12
  if ((enrichment.specifications || []).length >= 3) score += 12
  if ((product.images || []).length >= 4) score += 12
  if ((product.variants || []).length >= 1) score += 8
  if ((enrichment.source_urls || []).length >= 2) score += 12
  if (enrichment.manufacturer?.verified) score += 12
  return Math.min(100, score)
}

function publishBlockers(product, enrichment, quality) {
  const blockers = []
  if (Number(product.eu_stock_total || 0) <= 0) blockers.push('Kein verifizierter EU-Lagerbestand')
  if ((product.images || []).length < 3) blockers.push('Zu wenige belastbare Produktbilder')
  if ((enrichment.source_urls || []).length < 2) blockers.push('Weniger als zwei Recherchequellen')
  if (!enrichment.manufacturer?.verified) blockers.push('Hersteller nicht verifiziert')
  if (quality < 75) blockers.push(`Datenqualität nur ${quality}/100`)
  if (product.risk_level === 'high') blockers.push('Erweiterte Compliance-Prüfung erforderlich')
  if ((enrichment.description_de || '').length < 300) blockers.push('Produktbeschreibung zu kurz')
  return blockers
}

function mapVariants(product) {
  return (product.variants || [])
    .filter((variant) => Number(variant.verified_eu_stock || 0) > 0)
    .map((variant) => ({
      cj_variant_id: variant.cj_variant_id,
      sku: variant.sku,
      name: variant.name,
      price: retailPrice(variant.cost_usd || product.cost_usd),
      stock: Number(variant.verified_eu_stock || 0),
      image_url: variant.image_url,
    }))
}

async function persistProduct(product, enrichment) {
  const id = productUuid(product.cj_product_id)
  const quality = calculateQuality(product, enrichment)
  const blockers = publishBlockers(product, enrichment, quality)
  const sources = validHttpsUrls(enrichment.source_urls)
  const variants = mapVariants(product)
  const now = new Date().toISOString()
  const manufacturerVerified = Boolean(
    enrichment.manufacturer?.verified &&
      enrichment.manufacturer?.name &&
      enrichment.manufacturer?.source_url &&
      sources.includes(enrichment.manufacturer.source_url),
  )

  const row = {
    id,
    name: enrichment.title_de,
    title_de: enrichment.title_de,
    slug: `${slugify(enrichment.short_title_de || enrichment.title_de)}-${product.cj_product_id.slice(-8).toLowerCase()}`,
    description: enrichment.description_de,
    description_de: enrichment.description_de,
    price: Number(product.recommended_retail_eur || retailPrice(product.cost_usd)),
    images: product.images || [],
    image_gallery: product.images || [],
    variants,
    stock: variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0),
    is_active: false,
    cj_product_id: product.cj_product_id,
    cj_variant_id: variants[0]?.cj_variant_id || null,
    cj_sku: variants[0]?.sku || null,
    cj_cost_price: product.cost_usd,
    cj_last_synced_at: now,
    pipeline_state: 'enriched',
    approval_state: 'review_required',
    data_quality_score: quality,
    creative_status: 'missing',
    risk_level: product.risk_level || 'unknown',
    publish_blockers: blockers,
    research_source_urls: sources,
    manufacturer_name: manufacturerVerified ? enrichment.manufacturer.name : null,
    manufacturer_address: manufacturerVerified ? enrichment.manufacturer.address : null,
    manufacturer_email: manufacturerVerified ? enrichment.manufacturer.email : null,
    manufacturer_phone: manufacturerVerified ? enrichment.manufacturer.phone : null,
    manufacturer_verified: manufacturerVerified,
    responsible_person_verified: false,
    last_enriched_at: now,
    metadata: {
      pipeline_state: 'enriched',
      approval_state: 'review_required',
      trend: {
        keyword: product.trend_keyword,
        score: product.trend_score,
        source: product.trend_source,
        source_url: product.trend_source_url,
      },
      sourcing: {
        rank: product.rank,
        rank_score: product.rank_score,
        eu_stock_total: product.eu_stock_total,
        delivery_time_hours: product.delivery_time_hours,
      },
      seo: {
        title: enrichment.seo_title,
        description: enrichment.seo_description,
      },
      selling_points: enrichment.selling_points,
      specifications: enrichment.specifications,
      safety_notes: enrichment.safety_notes,
      prohibited_claims: enrichment.prohibited_claims,
      image_prompts: enrichment.image_prompts,
      ugc_hooks: enrichment.ugc_hooks,
      research_provider: enrichment.research_provider,
      research_model: enrichment.research_model,
      research_confidence: enrichment.confidence,
      enriched_at: now,
    },
  }

  const { error: productError } = await shop.from('products').upsert(row, { onConflict: 'id' })
  if (productError) throw productError

  if (sources.length) {
    const sourceRows = sources.map((sourceUrl) => ({
      product_id: id,
      source_url: sourceUrl,
      source_type: sourceUrl.includes('cjdropshipping.com') ? 'supplier' : 'web',
      source_title:
        enrichment.citation_metadata?.find((citation) => citation.url === sourceUrl)?.title || null,
      extracted_data: {
        product_title: enrichment.title_de,
        specifications: enrichment.specifications.filter((spec) => spec.source_url === sourceUrl),
        manufacturer: enrichment.manufacturer?.source_url === sourceUrl ? enrichment.manufacturer : null,
      },
      confidence: Number(enrichment.confidence || 0),
      status: 'active',
      checked_at: now,
    }))
    const { error: sourceError } = await control
      .from('product_research_sources')
      .upsert(sourceRows, { onConflict: 'product_id,source_url' })
    if (sourceError) throw sourceError
  }

  await control
    .from('supplier_catalog_products')
    .update({
      status: 'reviewing',
      review_note: blockers.length ? blockers.join('; ') : 'Enrichment completed; human approval required.',
      metadata: { ...product, enrichment, product_id: id, quality, blockers },
      imported_product_id: id,
      updated_at: now,
    })
    .eq('external_product_id', product.cj_product_id)

  return { id, quality, blockers, sources, manufacturer_verified: manufacturerVerified }
}

async function main() {
  const input = JSON.parse(await fs.readFile(INPUT_FILE, 'utf8'))
  const products = (input.products || input).slice(0, MAX_PRODUCTS)
  if (!products.length) throw new Error('No CJ products available for enrichment')

  const results = []
  for (const product of products) {
    console.log(`Researching ${product.rank || '?'} · ${product.title}`)
    try {
      const enrichment = await researchProduct(product)
      const persisted = await persistProduct(product, enrichment)
      results.push({
        ...product,
        enrichment,
        product_id: persisted.id,
        data_quality_score: persisted.quality,
        publish_blockers: persisted.blockers,
        status: persisted.blockers.length ? 'review_required' : 'enriched',
      })
      console.log(`  quality ${persisted.quality}/100 · blockers ${persisted.blockers.length}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      results.push({ ...product, status: 'failed', error: message })
      console.error(`  failed: ${message}`)
    }
  }

  const successful = results.filter((result) => result.status !== 'failed')
  if (!successful.length) throw new Error('All product enrichment jobs failed')

  const output = {
    generated_at: new Date().toISOString(),
    provider: process.env.PRODUCT_RESEARCH_ENDPOINT ? 'custom' : 'openai',
    model: process.env.PRODUCT_RESEARCH_ENDPOINT ? null : MODEL,
    total: results.length,
    successful: successful.length,
    failed: results.length - successful.length,
    products: results,
  }
  await fs.writeFile(OUTPUT_FILE, `${JSON.stringify(output, null, 2)}\n`)
  console.log(`Wrote enrichment report to ${OUTPUT_FILE}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
