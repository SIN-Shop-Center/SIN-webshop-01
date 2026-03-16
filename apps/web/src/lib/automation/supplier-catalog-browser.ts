import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

type HarvestRequest = {
  supplier_id?: string
  target_url?: string
  candidate_urls?: unknown
  catalog_status?: string
  browser_recipe?: Record<string, unknown>
  request_payload?: Record<string, unknown>
}

type HarvestItem = {
  external_product_id: string
  supplier_sku: string
  title: string
  description: string
  source_url: string
  image_url: string
  currency: string
  price: number | null
  compare_at_price: number | null
  minimum_order_quantity: number | null
  stock_hint: number | null
  lead_time_days: number | null
  status: string
  review_note: string
  ai_score: number | null
  metadata: Record<string, unknown>
}

export type SupplierCatalogHarvestResult = {
  status: 'completed' | 'empty'
  items: HarvestItem[]
  inspected_urls: string[]
  errors: string[]
}

const MAX_CANDIDATE_URLS = 5
const MAX_DISCOVERED_PRODUCT_LINKS = 10
const MAX_PRODUCT_FETCHES = 6
const MAX_ITEMS = 30
const FETCH_TIMEOUT_MS = 15_000
const MAX_HTML_BYTES = 900_000
const HTML_CONTENT_TYPES = ['text/html', 'application/xhtml+xml']
const JSON_CONTENT_TYPES = ['application/json', 'application/ld+json']
const BLOCKED_HOST_SUFFIXES = ['.local', '.internal', '.localhost']
const PRODUCT_LINK_HINTS = ['/product', '/products', '/item', '/artikel', '/shop', '/catalog']

export function resolveSupplierAutomationSecrets(): string[] {
  return [
    process.env.SUPPLIER_WEBHOOK_SECRET,
    process.env.SUPPLIER_ONBOARDING_CALLBACK_SECRET,
    process.env.N8N_SHARED_SECRET,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
}

export function validateSupplierAutomationToken(token: string): boolean {
  const secrets = resolveSupplierAutomationSecrets()
  if (secrets.length === 0) {
    return process.env.NODE_ENV !== 'production'
  }
  return secrets.includes(token.trim())
}

export async function harvestSupplierCatalog(request: HarvestRequest): Promise<SupplierCatalogHarvestResult> {
  const status = firstNonEmpty(request.catalog_status, 'new').toLowerCase()
  const requestedMaxItems = asPositiveInt(request.request_payload?.max_items) ?? asPositiveInt(request.browser_recipe?.max_items)
  const maxItems = Math.min(requestedMaxItems ?? MAX_ITEMS, MAX_ITEMS)
  const candidateUrls = normalizeURLCandidates(request)
  const inspectedURLs: string[] = []
  const errors: string[] = []
  const products = new Map<string, HarvestItem>()

  for (const candidateURL of candidateUrls) {
    inspectedURLs.push(candidateURL)

    let page: FetchedPage
    try {
      page = await fetchPage(candidateURL)
    } catch (error) {
      errors.push(`${candidateURL}: ${error instanceof Error ? error.message : String(error)}`)
      continue
    }

    addProducts(products, extractProductsFromPayload(page, status), maxItems)
    if (products.size >= maxItems) {
      break
    }

    if (page.kind !== 'html') {
      continue
    }

    const productLinks = extractProductLinks(page.body, candidateURL).slice(0, MAX_DISCOVERED_PRODUCT_LINKS)
    for (const productURL of productLinks.slice(0, MAX_PRODUCT_FETCHES)) {
      if (inspectedURLs.includes(productURL)) {
        continue
      }
      inspectedURLs.push(productURL)

      try {
        const productPage = await fetchPage(productURL)
        addProducts(products, extractProductsFromPayload(productPage, status), maxItems)
      } catch (error) {
        errors.push(`${productURL}: ${error instanceof Error ? error.message : String(error)}`)
      }

      if (products.size >= maxItems) {
        break
      }
    }

    if (products.size >= maxItems) {
      break
    }
  }

  return {
    status: products.size > 0 ? 'completed' : 'empty',
    items: Array.from(products.values()),
    inspected_urls: inspectedURLs,
    errors,
  }
}

type FetchedPage =
  | { kind: 'html'; url: string; body: string }
  | { kind: 'json'; url: string; body: unknown }

async function fetchPage(rawURL: string): Promise<FetchedPage> {
  const target = await assertSafeURL(rawURL)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(target.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'accept': 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.5',
        'user-agent': 'SimoneCatalogHarvester/1.0 (+https://simone.example)',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`upstream_status_${response.status}`)
    }

    const contentType = String(response.headers.get('content-type') || '').toLowerCase()
    if (HTML_CONTENT_TYPES.some((part) => contentType.includes(part))) {
      return {
        kind: 'html',
        url: response.url,
        body: await response.text(),
      }
    }

    if (JSON_CONTENT_TYPES.some((part) => contentType.includes(part))) {
      return {
        kind: 'json',
        url: response.url,
        body: await response.json(),
      }
    }

    const text = await response.text()
    if (text.length > MAX_HTML_BYTES) {
      throw new Error('response_too_large')
    }
    return {
      kind: 'html',
      url: response.url,
      body: text,
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function assertSafeURL(rawURL: string): Promise<URL> {
  let parsed: URL
  try {
    parsed = new URL(rawURL)
  } catch {
    throw new Error('invalid_url')
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('unsupported_protocol')
  }
  if (isBlockedHostname(parsed.hostname)) {
    throw new Error('blocked_hostname')
  }

  const records = await lookup(parsed.hostname, { all: true, verbatim: true })
  if (records.length === 0) {
    throw new Error('dns_resolution_failed')
  }
  for (const record of records) {
    if (isPrivateAddress(record.address)) {
      throw new Error('private_network_target_blocked')
    }
  }

  return parsed
}

function isBlockedHostname(hostname: string): boolean {
  const value = hostname.trim().toLowerCase()
  if (!value) {
    return true
  }
  if (value === 'localhost') {
    return true
  }
  return BLOCKED_HOST_SUFFIXES.some((suffix) => value.endsWith(suffix))
}

function isPrivateAddress(address: string): boolean {
  const version = isIP(address)
  if (version === 4) {
    const octets = address.split('.').map((part) => Number.parseInt(part, 10))
    if (octets.length !== 4 || octets.some((part) => Number.isNaN(part))) {
      return true
    }
    const [a, b] = octets
    if (a === 0 || a === 10 || a === 127) {
      return true
    }
    if (a === 169 && b === 254) {
      return true
    }
    if (a === 172 && b >= 16 && b <= 31) {
      return true
    }
    if (a === 192 && b === 168) {
      return true
    }
    if (a === 100 && b >= 64 && b <= 127) {
      return true
    }
    return false
  }

  if (version === 6) {
    const value = address.toLowerCase()
    return value === '::1' || value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe80:')
  }

  return true
}

function normalizeURLCandidates(request: HarvestRequest): string[] {
  const rawValues = [
    request.target_url,
    ...(Array.isArray(request.candidate_urls) ? request.candidate_urls : []),
    asString(request.request_payload?.catalog_url),
    asString(request.request_payload?.target_url),
    asString(request.request_payload?.portal_url),
    asString(request.request_payload?.website),
  ]

  const seen = new Set<string>()
  const urls: string[] = []
  for (const rawValue of rawValues) {
    const value = asString(rawValue)
    if (!value || seen.has(value)) {
      continue
    }
    seen.add(value)
    urls.push(value)
    if (urls.length >= MAX_CANDIDATE_URLS) {
      break
    }
  }
  return urls
}

function extractProductsFromPayload(page: FetchedPage, status: string): HarvestItem[] {
  if (page.kind === 'json') {
    return normalizeProducts(extractJsonProducts(page.body), page.url, status)
  }

  const products = [
    ...extractJsonLdProducts(page.body),
    ...extractMetaProducts(page.body, page.url),
  ]
  return normalizeProducts(products, page.url, status)
}

function extractJsonLdProducts(html: string): unknown[] {
  const matches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || []
  const products: unknown[] = []

  for (const match of matches) {
    const bodyMatch = match.match(/<script[^>]*>([\s\S]*?)<\/script>/i)
    const scriptBody = bodyMatch?.[1]?.trim()
    if (!scriptBody) {
      continue
    }

    const parsed = safeJsonParse(scriptBody)
    if (parsed === null) {
      continue
    }
    products.push(...extractJsonProducts(parsed))
  }

  return products
}

function extractJsonProducts(input: unknown): unknown[] {
  if (Array.isArray(input)) {
    return input.flatMap((item) => extractJsonProducts(item))
  }
  if (!isRecord(input)) {
    return []
  }

  const nodeType = normalizeType(input['@type'])
  const graph = input['@graph']
  const itemListElement = input.itemListElement
  const hasOffer = isRecord(input.offers) || Array.isArray(input.offers)

  if (nodeType.includes('product') || hasOffer) {
    return [input]
  }
  if (nodeType.includes('itemlist')) {
    return extractJsonProducts(itemListElement)
  }
  if (graph) {
    return extractJsonProducts(graph)
  }
  if (isRecord(itemListElement) || Array.isArray(itemListElement)) {
    return extractJsonProducts(itemListElement)
  }
  if (isRecord(input.item)) {
    return extractJsonProducts(input.item)
  }
  return []
}

function extractMetaProducts(html: string, fallbackURL: string): unknown[] {
  const title = firstNonEmpty(
    extractMetaContent(html, 'property', 'og:title'),
    extractMetaContent(html, 'name', 'twitter:title'),
    extractTagContent(html, 'title'),
  )
  const image = firstNonEmpty(
    extractMetaContent(html, 'property', 'og:image'),
    extractMetaContent(html, 'name', 'twitter:image'),
  )
  const price = firstNonEmpty(
    extractMetaContent(html, 'property', 'product:price:amount'),
    extractMetaContent(html, 'name', 'product:price:amount'),
  )
  const currency = firstNonEmpty(
    extractMetaContent(html, 'property', 'product:price:currency'),
    extractMetaContent(html, 'name', 'product:price:currency'),
    'EUR',
  )
  const description = firstNonEmpty(
    extractMetaContent(html, 'name', 'description'),
    extractMetaContent(html, 'property', 'og:description'),
  )

  if (!title || !price) {
    return []
  }

  return [{
    id: fallbackURL,
    name: title,
    description,
    image,
    offers: {
      price,
      priceCurrency: currency,
    },
    url: fallbackURL,
  }]
}

function normalizeProducts(products: unknown[], fallbackURL: string, status: string): HarvestItem[] {
  const normalized: HarvestItem[] = []

  for (const rawProduct of products) {
    if (!isRecord(rawProduct)) {
      continue
    }
    const offer = normalizeOffer(rawProduct.offers)
    const title = firstNonEmpty(rawProduct.name, rawProduct.title, rawProduct.product_name)
    if (!title) {
      continue
    }

    const sourceURL = firstNonEmpty(rawProduct.url, rawProduct.source_url, fallbackURL)
    normalized.push({
      external_product_id: firstNonEmpty(rawProduct.sku, rawProduct.productID, rawProduct.mpn, rawProduct.id, `${title}|${sourceURL}`),
      supplier_sku: firstNonEmpty(rawProduct.sku, rawProduct.productID),
      title,
      description: firstNonEmpty(rawProduct.description),
      source_url: sourceURL,
      image_url: normalizeImage(rawProduct.image),
      currency: firstNonEmpty(offer.priceCurrency, 'EUR').toUpperCase(),
      price: parseNumber(offer.price),
      compare_at_price: parseNumber(rawProduct.compare_at_price),
      minimum_order_quantity: parseNumber(rawProduct.minimum_order_quantity),
      stock_hint: parseInteger(rawProduct.stock_hint),
      lead_time_days: parseInteger(rawProduct.lead_time_days),
      status,
      review_note: firstNonEmpty(rawProduct.review_note),
      ai_score: parseNumber(rawProduct.ai_score),
      metadata: {
        availability: firstNonEmpty(offer.availability),
        brand: normalizeBrand(rawProduct.brand),
        category: firstNonEmpty(rawProduct.category),
      },
    })
  }

  return normalized
}

function addProducts(target: Map<string, HarvestItem>, items: HarvestItem[], maxItems: number) {
  for (const item of items) {
    const key = `${item.external_product_id}|${item.source_url || item.title}`.toLowerCase()
    if (target.has(key)) {
      continue
    }
    target.set(key, item)
    if (target.size >= maxItems) {
      return
    }
  }
}

function extractProductLinks(html: string, baseURL: string): string[] {
  const anchorMatches = html.match(/<a\b[^>]*href=["'][^"']+["'][^>]*>[\s\S]*?<\/a>/gi) || []
  const seen = new Set<string>()
  const urls: string[] = []

  for (const anchor of anchorMatches) {
    const hrefMatch = anchor.match(/href=["']([^"']+)["']/i)
    const href = hrefMatch?.[1]?.trim()
    if (!href) {
      continue
    }

    const text = stripTags(anchor).toLowerCase()
    const hrefLower = href.toLowerCase()
    const looksProductLike = PRODUCT_LINK_HINTS.some((hint) => hrefLower.includes(hint)) || /€|\$|eur|buy|shop|produkt/.test(text)
    if (!looksProductLike) {
      continue
    }

    let resolved: URL
    try {
      resolved = new URL(href, baseURL)
    } catch {
      continue
    }
    if (!['http:', 'https:'].includes(resolved.protocol)) {
      continue
    }

    const value = resolved.toString()
    if (seen.has(value)) {
      continue
    }
    seen.add(value)
    urls.push(value)
    if (urls.length >= MAX_DISCOVERED_PRODUCT_LINKS) {
      break
    }
  }

  return urls
}

function normalizeOffer(input: unknown): Record<string, unknown> {
  if (Array.isArray(input)) {
    return normalizeOffer(input[0])
  }
  if (isRecord(input)) {
    return input
  }
  return {}
}

function normalizeImage(input: unknown): string {
  if (Array.isArray(input)) {
    return firstNonEmpty(...input)
  }
  if (isRecord(input)) {
    return firstNonEmpty(input.url, input.contentUrl)
  }
  return firstNonEmpty(input)
}

function normalizeBrand(input: unknown): string {
  if (isRecord(input)) {
    return firstNonEmpty(input.name)
  }
  return firstNonEmpty(input)
}

function normalizeType(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || '').toLowerCase())
  }
  if (value === undefined || value === null) {
    return []
  }
  return [String(value).toLowerCase()]
}

function extractMetaContent(html: string, attribute: 'name' | 'property', key: string): string {
  const escapedKey = escapeRegex(key)
  const regex = new RegExp(`<meta[^>]+${attribute}=["']${escapedKey}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i')
  const match = html.match(regex)
  return match?.[1]?.trim() || ''
}

function extractTagContent(html: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const match = html.match(regex)
  return match ? stripTags(match[1]) : ''
}

function stripTags(input: string): string {
  return input.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function safeJsonParse(input: string): unknown | null {
  try {
    return JSON.parse(input)
  } catch {
    return null
  }
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  const stringValue = String(value ?? '').replace(/[^0-9,.-]/g, '').replace(',', '.').trim()
  if (!stringValue) {
    return null
  }
  const parsed = Number.parseFloat(stringValue)
  return Number.isFinite(parsed) ? parsed : null
}

function parseInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value)
  }
  const stringValue = String(value ?? '').replace(/[^0-9-]/g, '').trim()
  if (!stringValue) {
    return null
  }
  const parsed = Number.parseInt(stringValue, 10)
  return Number.isFinite(parsed) ? parsed : null
}

function asPositiveInt(value: unknown): number | null {
  const parsed = parseInteger(value)
  if (!parsed || parsed <= 0) {
    return null
  }
  return parsed
}

function firstNonEmpty(...values: unknown[]): string {
  for (const value of values) {
    const normalized = asString(value)
    if (normalized) {
      return normalized
    }
  }
  return ''
}

function asString(value: unknown): string {
  return String(value ?? '').trim()
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
