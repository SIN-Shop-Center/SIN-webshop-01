#!/usr/bin/env node
/**
 * Backfill: Füllt variants + image_gallery für BESTEHENDE Produkte nach
 * und übersetzt optional die englischen CJ-Rohtitel ins Deutsche.
 *
 * Usage:
 *   node scripts/cj/backfill-product-data.mjs                 # nur Daten
 *   node scripts/cj/backfill-product-data.mjs --translate     # + deutsche Titel
 *   node scripts/cj/backfill-product-data.mjs --dry-run       # nur anzeigen
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *      CJ_EMAIL, CJ_API_KEY, optional AI_GATEWAY_API_KEY (für --translate)
 */
import { createClient } from '@supabase/supabase-js'

const CJ_BASE = 'https://developers.cjdropshipping.com/api2.0/v1'
const MULTIPLIER = Number(process.env.CJ_PRICE_MULTIPLIER ?? '2.5')
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const TRANSLATE = args.includes('--translate')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false }, db: { schema: 'shop' } },
)

// ── CJ Auth (identisch zu import-products.mjs) ──────────────────────────────
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

function calcPrice(costUsd) {
  const raw = Number(costUsd) * MULTIPLIER
  return (Math.ceil(raw) - 0.01).toFixed(2)
}

function mapVariant(v) {
  const cost = Number(v.variantSellPrice ?? 0)
  return {
    cj_variant_id: String(v.vid),
    sku: v.variantSku ?? null,
    name: v.variantKey ?? v.variantNameEn ?? null,
    price: cost > 0 ? Number(calcPrice(cost)) : null,
    stock: Number(v.variantStock ?? 0) || 25,
    image_url: v.variantImage ?? null,
  }
}

function collectImages(detail, cjVariants) {
  const set = Array.isArray(detail.productImageSet)
    ? detail.productImageSet
    : typeof detail.productImageSet === 'string'
      ? (() => { try { return JSON.parse(detail.productImageSet) } catch { return [] } })()
      : []
  const variantImages = cjVariants.map((v) => v.variantImage).filter(Boolean)
  return [...new Set([detail.productImage, ...set, ...variantImages].filter(Boolean))]
}

// ── Optionale Titel-Übersetzung via Vercel AI Gateway ───────────────────────
async function translateTitle(englishTitle) {
  if (!process.env.AI_GATEWAY_API_KEY) return null
  try {
    const res = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.AI_GATEWAY_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-mini',
        messages: [
          {
            role: 'system',
            content:
              'Du bist Produkttexter für einen deutschen Online-Shop. Übersetze den ' +
              'englischen Dropshipping-Produkttitel in einen kurzen, natürlichen ' +
              'deutschen Produktnamen (max. 60 Zeichen, keine Anführungszeichen, ' +
              'kein Keyword-Spam). Antworte NUR mit dem Titel.',
          },
          { role: 'user', content: englishTitle },
        ],
      }),
    })
    const json = await res.json()
    const title = json.choices?.[0]?.message?.content?.trim()
    return title && title.length > 3 && title.length <= 80 ? title : null
  } catch (e) {
    console.warn(`  Übersetzung fehlgeschlagen: ${e.message}`)
    return null
  }
}

// ── Main ────────────────────────────────────────────────────────────────────
const { data: products, error } = await supabase
  .from('products')
  .select('id, name, cj_product_id, variants, image_gallery')
  .not('cj_product_id', 'is', null)

if (error) throw error
console.log(`${products.length} Produkte mit CJ-ID gefunden.${DRY_RUN ? ' (DRY RUN)' : ''}`)

let updated = 0
for (const p of products) {
  const hasVariants = Array.isArray(p.variants) && p.variants.length > 0
  const hasGallery = Array.isArray(p.image_gallery) && p.image_gallery.length > 1
  const needsTranslation = TRANSLATE && /^[\x00-\x7F]*$/.test(p.name ?? '')

  if (hasVariants && hasGallery && !needsTranslation) continue

  try {
    const detail = await cj('/product/query', { pid: p.cj_product_id })
    const cjVariants = detail.variants ?? []
    const patch = {}

    if (!hasVariants && cjVariants.length > 0) {
      patch.variants = cjVariants.map(mapVariant)
    }
    if (!hasGallery) {
      const images = collectImages(detail, cjVariants)
      if (images.length > 0) {
        patch.image_gallery = images
        patch.images = images
      }
    }
    if (needsTranslation) {
      const de = await translateTitle(p.name)
      if (de) patch.name = de
    }

    if (Object.keys(patch).length === 0) {
      console.log(`- ${p.id}: nichts zu tun`)
      continue
    }

    if (DRY_RUN) {
      console.log(
        `~ ${p.id}: würde setzen → ${Object.keys(patch).join(', ')}` +
          (patch.name ? ` (Titel: "${patch.name}")` : ''),
      )
    } else {
      patch.updated_at = new Date().toISOString()
      const { error: upErr } = await supabase.from('products').update(patch).eq('id', p.id)
      if (upErr) throw upErr
      console.log(
        `✓ ${p.id}: ${patch.variants ? `${patch.variants.length} Varianten` : ''} ` +
          `${patch.image_gallery ? `${patch.image_gallery.length} Bilder` : ''} ` +
          `${patch.name ? `Titel → "${patch.name}"` : ''}`,
      )
      updated++
    }
    await new Promise((r) => setTimeout(r, 1100)) // CJ Rate-Limit
  } catch (e) {
    console.error(`✗ ${p.id}: ${e.message}`)
  }
}
console.log(`Fertig. ${updated} Produkte aktualisiert.`)
