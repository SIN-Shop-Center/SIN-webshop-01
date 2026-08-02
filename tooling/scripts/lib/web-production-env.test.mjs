import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveWebProductionEnv } from './web-production-env.mjs'

test('resolveWebProductionEnv mirrors a single configured url to both outputs', () => {
  const resolved = resolveWebProductionEnv({ SITE_URL: 'https://shopsin.delqhi.com/' })
  assert.equal(resolved.siteUrl, 'https://shopsin.delqhi.com')
  assert.equal(resolved.publicAppUrl, 'https://shopsin.delqhi.com')
})

test('resolveWebProductionEnv uses an explicit non-secret CI fallback url', () => {
  const resolved = resolveWebProductionEnv({
    WEB_PRODUCTION_ENV_FALLBACK_URL: 'https://shopsin.delqhi.com',
  })
  assert.equal(resolved.siteUrl, 'https://shopsin.delqhi.com')
  assert.equal(resolved.publicAppUrl, 'https://shopsin.delqhi.com')
})

test('resolveWebProductionEnv rejects missing production urls', () => {
  assert.throws(() => resolveWebProductionEnv({}), /site_url_missing/)
})

test('resolveWebProductionEnv rejects mismatched public urls', () => {
  assert.throws(
    () =>
      resolveWebProductionEnv({
        SITE_URL: 'https://shopsin.delqhi.com',
        NEXT_PUBLIC_APP_URL: 'https://www.shopsin.delqhi.com',
      }),
    /site_url_mismatch/,
  )
})

test('resolveWebProductionEnv rejects localhost and placeholder hosts', () => {
  assert.throws(() => resolveWebProductionEnv({ SITE_URL: 'http://localhost:3000' }), /site_url_localhost_not_allowed/)
  assert.throws(() => resolveWebProductionEnv({ SITE_URL: 'https://runtime-check.invalid' }), /site_url_placeholder_not_allowed/)
})
