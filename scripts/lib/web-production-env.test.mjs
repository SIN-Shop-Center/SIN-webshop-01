import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveWebProductionEnv } from './web-production-env.mjs'

test('resolveWebProductionEnv mirrors a single configured url to both outputs', () => {
  const resolved = resolveWebProductionEnv({ SITE_URL: 'https://simone-shop.de/' })
  assert.equal(resolved.siteUrl, 'https://simone-shop.de')
  assert.equal(resolved.publicAppUrl, 'https://simone-shop.de')
})

test('resolveWebProductionEnv rejects missing production urls', () => {
  assert.throws(() => resolveWebProductionEnv({}), /site_url_missing/)
})

test('resolveWebProductionEnv rejects mismatched public urls', () => {
  assert.throws(
    () =>
      resolveWebProductionEnv({
        SITE_URL: 'https://simone-shop.de',
        NEXT_PUBLIC_APP_URL: 'https://www.simone-shop.de',
      }),
    /site_url_mismatch/,
  )
})

test('resolveWebProductionEnv rejects localhost and placeholder hosts', () => {
  assert.throws(() => resolveWebProductionEnv({ SITE_URL: 'http://localhost:3000' }), /site_url_localhost_not_allowed/)
  assert.throws(() => resolveWebProductionEnv({ SITE_URL: 'https://runtime-check.invalid' }), /site_url_placeholder_not_allowed/)
})
