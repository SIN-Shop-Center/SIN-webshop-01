import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const migration = readFileSync(
  'platform/infra/supabase/migrations/20260713000000_storefront_runtime_contract.sql',
  'utf8',
)
const cartAction = readFileSync('src/lib/actions/cart.ts', 'utf8')
const stripeWebhook = readFileSync('src/app/api/stripe/webhook/route.ts', 'utf8')
const emailWebhook = readFileSync('src/app/api/email/webhook/route.ts', 'utf8')
const localEnvTemplate = readFileSync('.env.example', 'utf8')
const liveEnvTemplate = readFileSync('.env.live.example', 'utf8')
const liveEnvSchema = readFileSync('tooling/scripts/live-env-schema.mjs', 'utf8')
const cronWorkflow = readFileSync('.github/workflows/crons.yml', 'utf8')

for (const functionName of [
  'shop.add_cart_item',
  'shop.set_cart_item_quantity',
  'shop.cleanup_stale_reservations',
]) {
  test(`storefront migration defines ${functionName}`, () => {
    assert.match(migration, new RegExp(`create or replace function ${functionName.replace('.', '\\.')}`))
  })
}

test('cart actions use atomic database mutations', () => {
  assert.match(cartAction, /\.rpc\('add_cart_item'/)
  assert.match(cartAction, /\.rpc\('set_cart_item_quantity'/)
  assert.doesNotMatch(cartAction, /\.rpc\('reserve_stock'/)
  assert.doesNotMatch(cartAction, /\.rpc\('release_stock'/)
})

test('variant-aware cart uniqueness is null-safe and guest-scoped', () => {
  assert.match(migration, /coalesce\(variant_id, ''\)/)
  assert.match(migration, /where cart_id is not null and product_id is not null/)
})

test('Stripe order idempotency is authoritative before audit marking', () => {
  assert.match(stripeWebhook, /orders\.stripe_session_id UNIQUE constraint is the source of truth/)
  assert.match(stripeWebhook, /Nothing is marked processed before this durable write succeeds/)
})

test('Resend webhook signing secret is part of every environment contract', () => {
  assert.match(emailWebhook, /process\.env\.RESEND_WEBHOOK_SECRET/)
  assert.match(localEnvTemplate, /^RESEND_WEBHOOK_SECRET=/m)
  assert.match(liveEnvTemplate, /^RESEND_WEBHOOK_SECRET=/m)
  assert.match(liveEnvSchema, /'RESEND_WEBHOOK_SECRET'/)
})

test('scheduled crons use a public base URL and fail closed without auth', () => {
  assert.match(cronWorkflow, /APP_URL: \$\{\{ vars\.APP_URL \|\| 'https:\/\/shopsin\.delqhi\.com' \}\}/)
  assert.doesNotMatch(cronWorkflow, /secrets\.APP_URL/)
  assert.match(cronWorkflow, /Missing required repository secret CRON_SECRET/)
  assert.match(cronWorkflow, /APP_URL must be an absolute https:\/\/ URL/)
})

test('legacy cart and idempotency setup scripts are disabled', () => {
  for (const path of [
    'tooling/scripts/supabase/setup-cart.sql',
    'tooling/scripts/supabase/setup-cart-variants.sql',
    'tooling/scripts/supabase/setup-idempotency.sql',
  ]) {
    const content = readFileSync(path, 'utf8')
    assert.match(content, /deprecated; run pnpm db:migrate/i)
  }
})
