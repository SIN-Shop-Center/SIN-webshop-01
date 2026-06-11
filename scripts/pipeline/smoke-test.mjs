// Purpose: Smoke-Test — prüft alle Pipeline-Voraussetzungen, bevor live gegangen wird
// Docs: docs/SIN_TIKTOK_MASTER_PIPELINE.md (Checkliste)
//
// Aufruf: node scripts/pipeline/smoke-test.mjs
// Exit-Code 0 = alles bereit, 1 = Probleme (siehe Output)

import { createClient } from '@supabase/supabase-js'

const checks = []
const ok = (name) => checks.push({ name, pass: true })
const fail = (name, hint) => checks.push({ name, pass: false, hint })

async function main() {
  for (const key of [
    'TIKTOK_APP_KEY',
    'TIKTOK_APP_SECRET',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'CRON_SECRET',
    'CJ_EMAIL',
    'CJ_API_KEY',
  ]) {
    process.env[key] ? ok(`env: ${key}`) : fail(`env: ${key}`, 'In .env / Vercel setzen')
  }

  const supabase = createClient(
    process.env.SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )

  const { error: authTableError } = await supabase
    .from('tiktok_auth')
    .select('id')
    .limit(1)
  authTableError
    ? fail('schema: tiktok_auth', `Migration 20260611120000 ausführen (${authTableError.message})`)
    : ok('schema: tiktok_auth')

  const { error: ordersTableError } = await supabase
    .from('tiktok_orders')
    .select('tiktok_order_id')
    .limit(1)
  ordersTableError
    ? fail('schema: tiktok_orders', `Migration 20260611130000 ausführen (${ordersTableError.message})`)
    : ok('schema: tiktok_orders')

  const { error: colError } = await supabase
    .from('products')
    .select('tiktok_status')
    .limit(1)
  colError
    ? fail('schema: products.tiktok_status', 'Migration 20260611120000 ausführen')
    : ok('schema: products.tiktok_status')

  const { data: auth } = await supabase
    .from('tiktok_auth')
    .select('access_token_expires_at, shop_cipher')
    .eq('id', 1)
    .maybeSingle()

  if (!auth) {
    fail('tiktok: autorisiert', 'Seller muss App autorisieren (OAuth-Link aus Partner Center)')
  } else {
    new Date(auth.access_token_expires_at) > new Date()
      ? ok('tiktok: access_token gültig')
      : fail('tiktok: access_token gültig', 'Token abgelaufen — Refresh läuft automatisch, sonst neu autorisieren')
    auth.shop_cipher ? ok('tiktok: shop_cipher') : fail('tiktok: shop_cipher', 'Wird beim ersten API-Call automatisch geholt')
  }

  const { count: pending } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('tiktok_status', 'pending')
  ok(`queue: ${pending ?? 0} Produkte pending`)

  console.log('\n=== SIN TikTok Pipeline Smoke-Test ===\n')
  for (const c of checks) {
    console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name}${c.hint ? `  → ${c.hint}` : ''}`)
  }
  const failed = checks.filter((c) => !c.pass)
  console.log(`\n${checks.length - failed.length}/${checks.length} Checks bestanden`)
  process.exit(failed.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
