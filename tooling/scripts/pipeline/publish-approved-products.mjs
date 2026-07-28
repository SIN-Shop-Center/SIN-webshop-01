#!/usr/bin/env node
/**
 * Activates products only after all commerce, creative and GPSR gates pass.
 * This script never approves products; it only publishes already-approved rows.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { createClient } from '@supabase/supabase-js'
import { loadLocalEnvFiles } from '../lib/cli-env.mjs'

loadLocalEnvFiles()

const ROOT = process.cwd()
const OUTPUT_FILE = path.join(ROOT, 'data', 'pipeline', 'publish-report.json')
const LIMIT = Math.max(1, Math.min(100, Number(process.env.SHOP_PUBLISH_LIMIT ?? 20)))
const MIN_QUALITY = Math.max(0, Math.min(100, Number(process.env.SHOP_MIN_DATA_QUALITY ?? 80)))

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

function productTitle(product) {
  return String(product.title_de || product.name || '').trim()
}

function productDescription(product) {
  return String(product.description_de || product.description || '').trim()
}

function validateProduct(product, creativeJob) {
  const blockers = []
  const title = productTitle(product)
  const description = productDescription(product)
  const images = [...new Set([
    ...asArray(product.images),
    ...asArray(product.image_gallery),
  ].filter(Boolean))]
  const variants = asArray(product.variants)

  if (product.approval_state !== 'approved') blockers.push('Produkt nicht freigegeben')
  if (product.pipeline_state !== 'ready_to_publish') blockers.push(`Pipeline-Status ist ${product.pipeline_state}`)
  if (product.creative_status !== 'approved') blockers.push('Creatives nicht freigegeben')
  if (!creativeJob || creativeJob.status !== 'approved') blockers.push('Kein freigegebener Creative-Job')
  if (!creativeJob?.render_path) blockers.push('Kein geprüfter Video-Render hinterlegt')
  if (Number(product.data_quality_score || 0) < MIN_QUALITY) {
    blockers.push(`Datenqualität unter ${MIN_QUALITY}`)
  }
  if (product.risk_level === 'high' || product.risk_level === 'blocked' || product.risk_level === 'unknown') {
    blockers.push(`Risiko-Level ${product.risk_level}`)
  }
  if (!product.manufacturer_verified) blockers.push('Hersteller nicht verifiziert')
  if (!product.responsible_person_verified) blockers.push('EU-Verantwortlicher nicht verifiziert')
  if (!product.gpsr_verified_at) blockers.push('GPSR-Prüfzeitpunkt fehlt')
  if (!product.manufacturer_name || !product.manufacturer_address || !product.manufacturer_email) {
    blockers.push('Hersteller-Kontaktdaten unvollständig')
  }
  if (!product.responsible_person_name || !product.responsible_person_address || !product.responsible_person_email) {
    blockers.push('EU-Verantwortlichen-Daten unvollständig')
  }
  if (title.length < 10) blockers.push('Produkttitel zu kurz')
  if (description.length < 300) blockers.push('Produktbeschreibung zu kurz')
  if (Number(product.price || 0) <= 0) blockers.push('Ungültiger Verkaufspreis')
  if (Number(product.stock || 0) <= 0) blockers.push('Kein Bestand')
  if (images.length < 4) blockers.push('Weniger als vier Produktbilder')
  if (!variants.some((variant) => Number(variant.stock || 0) > 0)) blockers.push('Keine kaufbare Variante')
  if (asArray(product.research_source_urls).length < 2) blockers.push('Zu wenige Recherchequellen')
  if (asArray(product.publish_blockers).length) {
    blockers.push(...asArray(product.publish_blockers).map((item) => String(item)))
  }

  return [...new Set(blockers)]
}

async function latestCreativeJob(productId) {
  const { data, error } = await control
    .from('commerce_creative_jobs')
    .select('id, status, approval_state, render_path, thumbnail_path, output_payload, updated_at')
    .eq('product_id', productId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

async function main() {
  const { data: products, error } = await shop
    .from('products')
    .select([
      'id', 'name', 'title_de', 'description', 'description_de', 'price', 'stock',
      'images', 'image_gallery', 'variants', 'is_active', 'metadata',
      'pipeline_state', 'approval_state', 'data_quality_score', 'creative_status',
      'risk_level', 'publish_blockers', 'research_source_urls',
      'manufacturer_name', 'manufacturer_address', 'manufacturer_email', 'manufacturer_phone',
      'manufacturer_verified', 'responsible_person_name', 'responsible_person_company',
      'responsible_person_address', 'responsible_person_email', 'responsible_person_phone',
      'responsible_person_verified', 'gpsr_verified_at', 'tiktok_status',
    ].join(','))
    .eq('approval_state', 'approved')
    .in('pipeline_state', ['ready_to_publish', 'published'])
    .order('updated_at', { ascending: true })
    .limit(LIMIT)
  if (error) throw error

  const published = []
  const blocked = []
  for (const product of products || []) {
    const creativeJob = await latestCreativeJob(product.id)
    const blockers = validateProduct(product, creativeJob)
    const now = new Date().toISOString()

    if (blockers.length) {
      const { error: blockError } = await shop
        .from('products')
        .update({
          is_active: false,
          publish_blockers: blockers,
          pipeline_state: product.pipeline_state === 'published' ? 'paused' : product.pipeline_state,
          updated_at: now,
        })
        .eq('id', product.id)
      if (blockError) throw blockError
      blocked.push({ product_id: product.id, title: productTitle(product), blockers })
      continue
    }

    const metadata = {
      ...(product.metadata || {}),
      publish: {
        shop_published_at: now,
        creative_job_id: creativeJob.id,
        render_path: creativeJob.render_path,
        thumbnail_path: creativeJob.thumbnail_path,
        quality_gate: MIN_QUALITY,
      },
    }

    const { error: publishError } = await shop
      .from('products')
      .update({
        is_active: true,
        pipeline_state: 'published',
        publish_blockers: [],
        tiktok_status: product.tiktok_status || 'pending',
        metadata,
        updated_at: now,
      })
      .eq('id', product.id)
    if (publishError) throw publishError

    await control
      .from('supplier_catalog_products')
      .update({ status: 'imported', imported_product_id: product.id, updated_at: now })
      .eq('imported_product_id', product.id)

    published.push({
      product_id: product.id,
      title: productTitle(product),
      creative_job_id: creativeJob.id,
      tiktok_status: product.tiktok_status || 'pending',
    })
  }

  const report = {
    generated_at: new Date().toISOString(),
    minimum_quality: MIN_QUALITY,
    inspected: (products || []).length,
    published: published.length,
    blocked: blocked.length,
    products: published,
    blockers: blocked,
  }
  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true })
  await fs.writeFile(OUTPUT_FILE, `${JSON.stringify(report, null, 2)}\n`)
  console.log(`Published ${published.length}; blocked ${blocked.length}; report ${OUTPUT_FILE}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
