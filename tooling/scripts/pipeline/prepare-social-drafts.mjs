#!/usr/bin/env node
/**
 * Prepares reviewable social posts and context-aware replies.
 *
 * It does not like, follow, message, comment or publish. Those actions require a
 * connected official API, human approval, rate limits and platform permission.
 */
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { createClient } from '@supabase/supabase-js'
import { loadLocalEnvFiles } from '../lib/cli-env.mjs'

loadLocalEnvFiles()

const ROOT = process.cwd()
const OPPORTUNITIES_FILE = path.join(ROOT, 'data', 'pipeline', 'social-opportunities.json')
const OUTPUT_FILE = path.join(ROOT, 'data', 'pipeline', 'social-drafts-report.json')
const LIMIT = Math.max(1, Math.min(100, Number(process.env.SOCIAL_DRAFT_DAILY_LIMIT ?? 20)))
const CHANNELS = String(process.env.SOCIAL_DRAFT_CHANNELS || 'tiktok,instagram,pinterest')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean)

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Supabase service-role configuration is required')

const shop = createClient(url, key, {
  auth: { persistSession: false },
  db: { schema: 'shop' },
})
const control = createClient(url, key, {
  auth: { persistSession: false },
  db: { schema: 'public' },
})

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function titleOf(product) {
  return String(product.title_de || product.name || '').trim()
}

function sellingPoints(product) {
  const metadata = product.metadata || {}
  return asArray(metadata.selling_points).map(String).filter(Boolean).slice(0, 3)
}

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 32)
}

function shopUrl(product) {
  const base = String(process.env.NEXT_PUBLIC_APP_URL || 'https://shopsin.delqhi.com').replace(/\/$/, '')
  return `${base}/produkte/${product.slug}`
}

function buildChannelPost(product, channel) {
  const title = titleOf(product)
  const points = sellingPoints(product)
  const benefit = points[0] || 'praktisch im Alltag einsetzbar'
  const second = points[1] ? ` ${points[1]}.` : ''
  const disclosure = '#Werbung'

  if (channel === 'tiktok') {
    return `${disclosure} ${title}: ${benefit}.${second} Im Video siehst du das Produkt im Einsatz. Details, Varianten und aktuelle Verfügbarkeit findest du im Shop: ${shopUrl(product)}`
  }
  if (channel === 'instagram') {
    return `${disclosure}\n\n${title}\n\n${benefit}.${second}\n\nProduktdetails, Varianten und Verfügbarkeit: ${shopUrl(product)}`
  }
  if (channel === 'pinterest') {
    return `${title} – ${benefit}. Produktdetails und Varianten bei ShopSIN: ${shopUrl(product)} ${disclosure}`
  }
  return `${disclosure} ${title}: ${benefit}. ${shopUrl(product)}`
}

function buildOpportunityDraft(opportunity, product) {
  const publicComment = String(opportunity.public_comment || opportunity.context || '').trim()
  const requestedQuestion = String(opportunity.question || '').trim()
  const facts = sellingPoints(product)
  const fact = facts[0] || 'Die vollständigen Produktdetails stehen auf der Shopseite.'

  if (opportunity.interaction_type === 'comment_reply') {
    const questionContext = requestedQuestion || publicComment
    return `Danke für deine Frage${questionContext ? ` zu „${questionContext.slice(0, 100)}“` : ''}. ${fact} Varianten, Preis und aktuelle Verfügbarkeit findest du hier: ${shopUrl(product)} — Werbung` 
  }

  if (opportunity.interaction_type === 'creator_outreach') {
    return `Hallo, dein öffentlicher Content passt thematisch zu ${titleOf(product)}. Wir würden dir gern unverbindlich Produktdetails und mögliche Kooperationsbedingungen schicken. Nur bei Interesse antworten; ansonsten melden wir uns nicht erneut. Werbung/Kooperationsanfrage von ShopSIN.`
  }

  if (opportunity.interaction_type === 'community_share') {
    return `Werbung: ${titleOf(product)} könnte für diese Diskussion relevant sein, weil ${fact.toLowerCase()} Mehr Details und die aktuelle Verfügbarkeit: ${shopUrl(product)}`
  }

  return buildChannelPost(product, opportunity.channel || 'social')
}

async function readOpportunities() {
  try {
    const parsed = JSON.parse(await fs.readFile(OPPORTUNITIES_FILE, 'utf8'))
    return Array.isArray(parsed) ? parsed : parsed.opportunities || []
  } catch (error) {
    if (error?.code === 'ENOENT') return []
    throw error
  }
}

function validateOpportunity(opportunity) {
  const allowed = new Set(['comment_reply', 'creator_outreach', 'community_share'])
  if (!allowed.has(opportunity.interaction_type)) return 'Nicht erlaubter Interaktionstyp'
  if (!opportunity.product_id) return 'Produkt-ID fehlt'
  if (!opportunity.channel) return 'Channel fehlt'
  if (!opportunity.source_url || !/^https:\/\//i.test(opportunity.source_url)) return 'Öffentliche Quell-URL fehlt'
  if (!opportunity.audience_ref) return 'Öffentliche Zielreferenz fehlt'
  if (opportunity.opted_out === true) return 'Opt-out gesetzt'
  return null
}

async function publishedProducts() {
  const { data, error } = await shop
    .from('products')
    .select('id, name, title_de, slug, metadata, pipeline_state, approval_state, creative_status, is_active')
    .eq('is_active', true)
    .eq('pipeline_state', 'published')
    .eq('approval_state', 'approved')
    .eq('creative_status', 'approved')
    .limit(LIMIT)
  if (error) throw error
  return data || []
}

async function main() {
  const products = await publishedProducts()
  const byId = new Map(products.map((product) => [product.id, product]))
  const rows = []
  const rejected = []

  for (const product of products) {
    for (const channel of CHANNELS) {
      const message = buildChannelPost(product, channel)
      const idempotencyKey = `post:${channel}:${product.id}:${new Date().toISOString().slice(0, 10)}`
      rows.push({
        product_id: product.id,
        channel,
        interaction_type: 'post',
        audience_ref: null,
        source_url: shopUrl(product),
        message,
        context: {
          product_title: titleOf(product),
          generated_from: 'approved_product_data',
          commercial_disclosure: true,
          requires_human_review: true,
        },
        status: 'draft',
        consent_basis: 'owned_channel',
        idempotency_key: hash(idempotencyKey),
      })
      if (rows.length >= LIMIT) break
    }
    if (rows.length >= LIMIT) break
  }

  const opportunities = await readOpportunities()
  for (const opportunity of opportunities) {
    if (rows.length >= LIMIT) break
    const validationError = validateOpportunity(opportunity)
    const product = byId.get(opportunity.product_id)
    if (validationError || !product) {
      rejected.push({ opportunity, reason: validationError || 'Produkt ist nicht veröffentlicht/freigegeben' })
      continue
    }

    const message = buildOpportunityDraft(opportunity, product)
    rows.push({
      product_id: product.id,
      channel: opportunity.channel,
      interaction_type: opportunity.interaction_type,
      audience_ref: String(opportunity.audience_ref),
      source_url: opportunity.source_url,
      message,
      context: {
        public_comment: opportunity.public_comment || null,
        question: opportunity.question || null,
        imported_at: new Date().toISOString(),
        requires_human_review: true,
        one_contact_only: true,
      },
      status: 'draft',
      consent_basis: 'public_context',
      idempotency_key: hash([
        opportunity.channel,
        opportunity.interaction_type,
        opportunity.audience_ref,
        opportunity.source_url,
        product.id,
      ].join(':')),
    })
  }

  if (rows.length) {
    const { error } = await control
      .from('engagement_drafts')
      .upsert(rows, { onConflict: 'idempotency_key', ignoreDuplicates: true })
    if (error) throw error
  }

  const report = {
    generated_at: new Date().toISOString(),
    policy: {
      automatic_engagement: false,
      fake_likes_or_follows: false,
      direct_messages_sent: false,
      human_review_required: true,
      opt_out_respected: true,
    },
    products_considered: products.length,
    opportunities_considered: opportunities.length,
    drafts_prepared: rows.length,
    rejected: rejected.length,
    rejection_details: rejected,
  }
  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true })
  await fs.writeFile(OUTPUT_FILE, `${JSON.stringify(report, null, 2)}\n`)
  console.log(`Prepared ${rows.length} social drafts; sent nothing; report ${OUTPUT_FILE}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
