// Purpose: Translate English CJ product titles/descriptions to German via Cloudflare Workers AI
// Usage: node scripts/cj/translate-products-cf.mjs [--limit N] [--dry-run]
// Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_KEY

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: 'shop' } },
)

// Cloudflare Workers AI config
const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID || '1f7ab05e43657db15341b691070ea4c8'
const CF_EMAIL = process.env.CLOUDFLARE_EMAIL || 'zukunftsorientierte.energie@gmail.com'
const CF_GLOBAL_KEY = process.env.CLOUDFLARE_GLOBAL_KEY
// Use Global API Key (X-Auth-Key + X-Auth-Email) for now, or API Token (Bearer)
// Best model for German: @cf/meta/llama-4-scout-17b-16e-instruct (multilingual)
const MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct'

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const LIMIT = Number(args[args.indexOf('--limit') + 1] ?? '9999') || 9999

async function translate(text) {
  if (!text || text.length < 5) return text
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/run/${MODEL}`

  const headers = {
    'Content-Type': 'application/json',
  }
  // Use API Token (Bearer) if set, else fall back to Global API Key
  if (process.env.CLOUDFLARE_API_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`
  } else if (CF_GLOBAL_KEY && CF_EMAIL) {
    headers['X-Auth-Email'] = CF_EMAIL
    headers['X-Auth-Key'] = CF_GLOBAL_KEY
  } else {
    throw new Error('No Cloudflare auth configured. Set CLOUDFLARE_API_TOKEN or CLOUDFLARE_GLOBAL_KEY+CLOUDFLARE_EMAIL')
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      messages: [
        {
          role: 'system',
          content:
            'Du bist ein Produkttexter für einen deutschen Online-Shop. ' +
            'Übersetze den englischen Titel/Text natürlich und verkaufsstark ins Deutsche. ' +
            'Antworte NUR mit der Übersetzung — keine Anführungszeichen, max 60 Zeichen für Titel. ' +
            'Vermeide Keyword-Spam. Bleibe bei Produkt-Eigenschaften, die der englische Titel nennt.',
        },
        { role: 'user', content: text },
      ],
      max_tokens: 200,
      temperature: 0.5,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`CF Workers AI error ${res.status}: ${err}`)
  }

  const data = await res.json()
  if (!data.success) {
    throw new Error(`CF API error: ${JSON.stringify(data.errors)}`)
  }

  const result = data.result?.response?.trim()
  if (!result || result.length < 3) {
    throw new Error(`Empty translation for: ${text}`)
  }
  return result
}

async function main() {
  console.log(`🤖 Cloudflare Workers AI Translation (Model: ${MODEL})`)
  console.log(`   Account: ${CF_ACCOUNT}`)
  console.log('')

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, title_de, description, description_de')
    .is('title_de', null)
    .limit(LIMIT)

  if (error) throw error
  console.log(`${products.length} Produkte zu übersetzen…${DRY_RUN ? ' (DRY RUN)' : ''}\n`)

  let updated = 0
  let errors = 0
  for (const p of products) {
    if (!p.name || !/^[\x00-\x7F]*$/.test(p.name)) {
      // Skip non-English titles (already contains non-ASCII)
      continue
    }
    try {
      const titleDe = await translate(p.name)
      const descDe = p.description && /^[\x00-\x7F]*$/.test(p.description) ? await translate(p.description.slice(0, 1000)) : null

      if (DRY_RUN) {
        console.log(`~ ${p.name}\n   → ${titleDe}`)
      } else {
        const { error: upErr } = await supabase
          .from('products')
          .update({
            title_de: titleDe,
            ...(descDe ? { description_de: descDe } : {}),
          })
          .eq('id', p.id)
        if (upErr) throw upErr
        console.log(`✓ ${p.name} → ${titleDe}`)
        updated++
      }
    } catch (e) {
      console.error(`✗ ${p.id}: ${e.message}`)
      errors++
    }
    // CF rate-limit is generous, but be polite
    await new Promise((r) => setTimeout(r, 200))
  }
  console.log(`\nFertig. ${updated} aktualisiert, ${errors} Fehler.`)
}

main().catch((e) => {
  console.error('FATAL:', e.message)
  process.exit(1)
})
