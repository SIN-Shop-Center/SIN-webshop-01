import test from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'

const execFileAsync = promisify(execFile)
const cwd = process.cwd()

async function runNodeScript(relativePath, args = []) {
  const scriptPath = path.join(cwd, relativePath)
  const { stdout } = await execFileAsync('node', [scriptPath, ...args], {
    cwd,
    maxBuffer: 10 * 1024 * 1024,
  })
  return stdout
}

test('browser governance dry-run emits the V2 marker and both governance terms', async () => {
  const output = await runNodeScript('scripts/push-browser-governance-to-gdoc.mjs', ['--dry-run'])

  assert.match(output, /BROWSER_WORKFLOW_GOVERNANCE_DEFINITIONS_V2/)
  assert.doesNotMatch(output, /BROWSER_WORKFLOW_GOVERNANCE_DEFINITIONS_V1/)
  assert.match(output, /<interaction_invariant>/)
  assert.match(output, /<security_gate>/)
  assert.match(output, /<execution_boundary>/)
  assert.match(output, /Canonical Browser Workflow Rule Set/)
})

test('storefront governance dry-run emits the storefront marker and caller timestamp', async () => {
  const acceptedUtc = '2026-03-09T22:45:00.000Z'
  const output = await runNodeScript('scripts/push-storefront-governance-to-gdoc.mjs', [
    '--dry-run',
    `--accepted-utc=${acceptedUtc}`,
  ])

  assert.match(output, /SHOP_STOREFRONT_GOVERNANCE_V1/)
  assert.match(output, new RegExp(`<accepted_utc>${acceptedUtc}</accepted_utc>`))
  assert.match(output, /critical_invariant/)
  assert.match(output, /halt_condition/)
  assert.match(output, /evidence_trace/)
})
