#!/usr/bin/env node
/**
 * Testet, ob der Stripe Secret Key gültig ist.
 * Zeigt Account-Status und ob der Key abgelaufen ist.
 *
 * Usage: node scripts/test-stripe-key.mjs
 */

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY

if (!STRIPE_KEY) {
  console.error('❌ STRIPE_SECRET_KEY nicht gesetzt (env var oder .env.local laden)')
  process.exit(1)
}

console.log('🧪 Teste Stripe Key...')

const res = await fetch('https://api.stripe.com/v1/account', {
  headers: { Authorization: `Bearer ${STRIPE_KEY}` },
})

const json = await res.json()

if (json.error) {
  console.error(`❌ Stripe Key UNGÜLTIG:`)
  console.error(`   Type: ${json.error.type}`)
  console.error(`   Code: ${json.error.code}`)
  console.error(`   Message: ${json.error.message}`)
  
  if (json.error.code === 'api_key_expired') {
    console.error('\n🔴 KEY ABGELAUFEN!')
    console.error('   → Stripe Dashboard → Developers → API Keys → Roll key')
    console.error('   → Neuen Key in .env.local eintragen')
    console.error('   → node scripts/deploy-cloudflare-secrets.mjs')
    console.error('   → node scripts/deploy-github-secrets.mjs')
    console.error('   → wrangler deploy')
  }
  process.exit(1)
}

console.log('✅ Stripe Key GÜLTIG!')
console.log(`   Account: ${json.settings?.dashboard?.display_name || json.id}`)
console.log(`   Email: ${json.email || 'n/a'}`)
console.log(`   Charges enabled: ${json.charges_enabled}`)
console.log(`   Payouts enabled: ${json.payouts_enabled}`)

if (!json.charges_enabled) {
  console.warn('\n⚠️  ACHTUNG: Charges disabled — Account möglicherweise eingeschränkt!')
  console.warn('   → Stripe Dashboard → Account → Verification prüfen')
}

if (!json.payouts_enabled) {
  console.warn('\n⚠️  ACHTUNG: Payouts disabled — Geld kann nicht ausgezahlt werden!')
  console.warn('   → Stripe Dashboard → Account → Bank Account verifizieren')
}
