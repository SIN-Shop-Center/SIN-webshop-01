import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { after, before, test } from 'node:test'

import { buildPlan } from '../src/contracts.mjs'
import { createLogisticServer } from '../src/server.mjs'

let server
let baseUrl

before(async () => {
  server = createLogisticServer()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(() => server.close())

test('health and agent card contracts are available', async () => {
  const health = await fetch(`${baseUrl}/health`)
  assert.equal(health.status, 200)
  assert.equal((await health.json()).dryRunDefault, true)
  const card = await (await fetch(`${baseUrl}/.well-known/agent-card.json`)).json()
  assert.equal(card.name, 'SIN-Shop-Logistic')
  assert.equal(card.url, baseUrl)
})

test('REST, JSON-RPC and MCP return dry-run plans', async () => {
  const rest = await fetch(`${baseUrl}/a2a/rest`, {
    method: 'POST',
    body: JSON.stringify({ flow: 'product-integration' }),
  })
  assert.equal((await rest.json()).mode, 'dry-run')

  const rpc = await fetch(`${baseUrl}/a2a/jsonrpc`, {
    method: 'POST',
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'message/send', params: { flow: 'tiktok-draft-sync' } }),
  })
  assert.equal((await rpc.json()).result.flow, 'tiktok-draft-sync')

  const mcp = await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }),
  })
  assert.equal((await mcp.json()).result.tools[0].name, 'logistics_plan')
})

test('non-dry-run execution is rejected', () => {
  assert.throws(() => buildPlan({ flow: 'supplier-registration', dryRun: false }), /human-approved/)
})

test('browser automator writes audit artifacts and executes no external action', async () => {
  const artifacts = await mkdtemp(join(tmpdir(), 'sin-shop-logistic-'))
  const result = spawnSync('python3', [
    'browser-automator/automator.py',
    '--flow', 'supplier-registration',
    '--artifact-dir', artifacts,
  ], { cwd: new URL('..', import.meta.url), encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  const audit = JSON.parse(await readFile(join(artifacts, 'audit.json'), 'utf8'))
  assert.equal(audit.mode, 'dry-run')
  assert.deepEqual(audit.irreversible_actions_executed, [])
  assert.ok(audit.human_gates.includes('captcha'))
  assert.ok(audit.human_gates.includes('payment'))
  assert.ok(audit.human_gates.includes('publication'))
})
