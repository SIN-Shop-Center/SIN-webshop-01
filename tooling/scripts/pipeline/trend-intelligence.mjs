#!/usr/bin/env node
/**
 * Evidence-first trend ingestion.
 *
 * Sources:
 *  - Google Trends "Trending now" RSS for Germany (real external signal)
 *  - TREND_SOURCE_ENDPOINTS_JSON: optional JSON array of HTTP feeds
 *  - TREND_BROWSER_OUTPUT: optional local JSON produced by an approved browser scraper
 *
 * The script never asks an LLM to invent trends. Every candidate retains source,
 * URL, observed timestamp and raw metrics.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { createClient } from '@supabase/supabase-js'
import { loadLocalEnvFiles } from '../lib/cli-env.mjs'

loadLocalEnvFiles()

const ROOT = process.cwd()
const OUTPUT_DIR = path.join(ROOT, 'data', 'pipeline')
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'trends-output.json')
const BROWSER_FILE = process.env.TREND_BROWSER_OUTPUT
  ? path.resolve(process.env.TREND_BROWSER_OUTPUT)
  : path.join(OUTPUT_DIR, 'browser-trends.json')
const GOOGLE_RSS = process.env.GOOGLE_TRENDS_RSS_URL || 'https://trends.google.com/trending/rss?geo=DE'
const MAX_CANDIDATES = Math.max(10, Math.min(200, Number(process.env.TREND_MAX_CANDIDATES ?? 60)))

const PRODUCT_HINTS = [
  'shop', 'kaufen', 'produkt', 'gadget', 'beauty', 'pflege', 'küche', 'haushalt',
  'fitness', 'tier', 'katze', 'hund', 'baby', 'spielzeug', 'lampe', 'licht', 'organizer',
  'tasche', 'flasche', 'becher', 'kopfhörer', 'kamera', 'charger', 'case', 'home',
  'garden', 'pet', 'toy', 'wireless', 'portable', 'mini', 'smart', 'cleaner', 'brush',
]

const LOW_COMMERCE_HINTS = [
  'bundestag', 'wahl', 'minister', 'präsident', 'krieg', 'unfall', 'erdbeben', 'tot',
  'gestorben', 'bundesliga', 'champions league', 'wetter', 'aktie', 'kurs', 'stream',
]

function decodeXml(value = '') {
  return value
    .replaceAll('<![CDATA[', '')
    .replaceAll(']]>', '')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .trim()
}

function tagValue(block, tag) {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return match ? decodeXml(match[1]) : ''
}

function parseTraffic(value) {
  const digits = String(value || '').replace(/[^\d]/g, '')
  return digits ? Number(digits) : 0
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

function commerceFit(title) {
  const normalized = title.toLowerCase()
  const positive = PRODUCT_HINTS.reduce((sum, hint) => sum + (normalized.includes(hint) ? 1 : 0), 0)
  const negative = LOW_COMMERCE_HINTS.reduce((sum, hint) => sum + (normalized.includes(hint) ? 1 : 0), 0)
  return clamp(50 + positive * 10 - negative * 18)
}

function normalizedScore({ suppliedScore, traffic, sourceWeight = 1, title }) {
  const trafficScore = traffic > 0 ? clamp(Math.log10(traffic + 1) * 18) : 35
  const external = Number.isFinite(Number(suppliedScore)) ? clamp(Number(suppliedScore)) : trafficScore
  return Number(clamp((external * 0.62 + commerceFit(title) * 0.38) * sourceWeight).toFixed(2))
}

function normalizeCandidate(raw, defaults = {}) {
  const title = String(raw.title || raw.keyword || raw.name || '').trim()
  if (title.length < 2) return null
  const traffic = Number(raw.traffic ?? raw.search_volume ?? raw.volume ?? 0) || 0
  const source = String(raw.source || defaults.source || 'external-feed')
  const sourceUrl = String(raw.source_url || raw.url || defaults.sourceUrl || '')
  const observedAt = raw.observed_at || raw.timestamp || defaults.observedAt || new Date().toISOString()
  const score = normalizedScore({
    suppliedScore: raw.score,
    traffic,
    sourceWeight: Number(defaults.sourceWeight ?? 1),
    title,
  })
  return {
    keyword: title,
    title,
    score,
    source,
    source_url: sourceUrl,
    observed_at: observedAt,
    traffic,
    commerce_fit: commerceFit(title),
    category: raw.category || raw.cluster || 'unclassified',
    evidence: raw.evidence || raw.metrics || raw.metadata || {},
  }
}

async function fetchGoogleTrends() {
  const response = await fetch(GOOGLE_RSS, {
    headers: { 'user-agent': 'ShopSIN-Commerce-Intelligence/1.0' },
  })
  if (!response.ok) throw new Error(`Google Trends RSS returned ${response.status}`)
  const xml = await response.text()
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => match[1])
  return items
    .map((item) => {
      const title = tagValue(item, 'title')
      const trafficText = tagValue(item, 'ht:approx_traffic')
      const pubDate = tagValue(item, 'pubDate')
      const link = tagValue(item, 'link')
      return normalizeCandidate(
        {
          title,
          traffic: parseTraffic(trafficText),
          source_url: link || GOOGLE_RSS,
          observed_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          evidence: { approximate_traffic: trafficText },
        },
        { source: 'google_trends_de', sourceUrl: GOOGLE_RSS, sourceWeight: 0.9 },
      )
    })
    .filter(Boolean)
}

async function readJsonIfPresent(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    throw error
  }
}

async function loadBrowserOutput() {
  const payload = await readJsonIfPresent(BROWSER_FILE)
  if (!payload) return []
  const entries = Array.isArray(payload) ? payload : payload.items || payload.trends || []
  return entries
    .map((entry) => normalizeCandidate(entry, {
      source: 'approved_browser_capture',
      sourceUrl: `file://${BROWSER_FILE}`,
      sourceWeight: 1.08,
    }))
    .filter(Boolean)
}

function parseFeedConfig() {
  if (!process.env.TREND_SOURCE_ENDPOINTS_JSON) return []
  const parsed = JSON.parse(process.env.TREND_SOURCE_ENDPOINTS_JSON)
  if (!Array.isArray(parsed)) throw new Error('TREND_SOURCE_ENDPOINTS_JSON must be a JSON array')
  return parsed
}

async function fetchConfiguredFeed(config) {
  if (!config?.url || !/^https:\/\//i.test(config.url)) {
    throw new Error('Configured trend feed must use an https URL')
  }
  const response = await fetch(config.url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'ShopSIN-Commerce-Intelligence/1.0',
      ...(config.headers || {}),
    },
  })
  if (!response.ok) throw new Error(`${config.name || config.url} returned ${response.status}`)
  const payload = await response.json()
  const entries = Array.isArray(payload)
    ? payload
    : payload.items || payload.trends || payload.data || []
  return entries
    .map((entry) => normalizeCandidate(entry, {
      source: config.name || new URL(config.url).hostname,
      sourceUrl: config.url,
      sourceWeight: Number(config.weight ?? 1),
    }))
    .filter(Boolean)
}

function dedupeAndRank(candidates) {
  const byKeyword = new Map()
  for (const candidate of candidates) {
    const key = candidate.keyword.toLocaleLowerCase('de-DE').replace(/\s+/g, ' ').trim()
    const current = byKeyword.get(key)
    if (!current || candidate.score > current.score) {
      byKeyword.set(key, candidate)
    } else if (current) {
      current.evidence = {
        ...current.evidence,
        corroborating_sources: [
          ...(current.evidence.corroborating_sources || []),
          { source: candidate.source, url: candidate.source_url, score: candidate.score },
        ],
      }
      current.score = Number(clamp(current.score + 3).toFixed(2))
    }
  }
  return [...byKeyword.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CANDIDATES)
}

async function persistCandidates(candidates, sourceErrors) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { inserted: 0, warning: 'Supabase env missing; JSON output only' }

  const control = createClient(url, key, {
    auth: { persistSession: false },
    db: { schema: 'public' },
  })
  const rows = candidates.map((candidate) => ({
    title: candidate.title,
    cluster: candidate.category || 'unclassified',
    country_scope: ['DE'],
    score: candidate.score,
    lifecycle_state: 'new',
    decision_state: candidate.score >= 70 ? 'review_required' : 'review_required',
    decision_reason: 'Evidence-backed trend signal; supplier and compliance validation required.',
    metadata: {
      keyword: candidate.keyword,
      source: candidate.source,
      source_url: candidate.source_url,
      observed_at: candidate.observed_at,
      traffic: candidate.traffic,
      commerce_fit: candidate.commerce_fit,
      evidence: candidate.evidence,
      source_errors: sourceErrors,
    },
  }))

  if (!rows.length) return { inserted: 0 }
  const { error } = await control.from('trend_candidates').insert(rows)
  if (error) throw error
  return { inserted: rows.length }
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true })
  const collected = []
  const sourceErrors = []

  const sources = [
    ['google_trends_de', fetchGoogleTrends],
    ['approved_browser_capture', loadBrowserOutput],
    ...parseFeedConfig().map((config) => [config.name || config.url, () => fetchConfiguredFeed(config)]),
  ]

  for (const [name, load] of sources) {
    try {
      const candidates = await load()
      collected.push(...candidates)
      console.log(`${name}: ${candidates.length} signals`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      sourceErrors.push({ source: name, error: message })
      console.warn(`${name}: ${message}`)
    }
  }

  const ranked = dedupeAndRank(collected)
  if (!ranked.length) {
    throw new Error('No real trend signals collected. Configure a source instead of generating synthetic trends.')
  }

  const report = {
    generated_at: new Date().toISOString(),
    country: 'DE',
    candidate_count: ranked.length,
    sources_attempted: sources.map(([name]) => name),
    source_errors: sourceErrors,
    candidates: ranked,
  }
  await fs.writeFile(OUTPUT_FILE, `${JSON.stringify(report, null, 2)}\n`)
  const persistence = await persistCandidates(ranked, sourceErrors)

  console.log(`Wrote ${ranked.length} evidence-backed candidates to ${OUTPUT_FILE}`)
  console.log(`Database: ${JSON.stringify(persistence)}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
