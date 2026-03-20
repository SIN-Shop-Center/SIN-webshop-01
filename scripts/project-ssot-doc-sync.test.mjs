import test from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'

const execFileAsync = promisify(execFile)
const cwd = process.cwd()

test('project SSOT sync dry-run reports the canonical markdown mirror set', async () => {
  const scriptPath = path.join(cwd, 'scripts', 'sync-project-ssot-doc.mjs')
  const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
    cwd,
    maxBuffer: 10 * 1024 * 1024,
  })

  const payload = JSON.parse(stdout)
  assert.equal(payload.documentTitle, 'simone-webshop-01 - SSOT-v2')
  assert.equal(payload.rootTabTitle, '00_INDEX')
  assert.equal(payload.sourceId, '34567ee6-d1c6-4a9f-96c6-1d573cf3da9e')
  assert.equal(payload.fileCount, payload.files.length)
  assert.ok(payload.files.includes('README.md'))
  assert.ok(payload.files.includes('AGENTS.md'))
  assert.ok(payload.files.includes('docs/go-live-today-checklist.md'))
  assert.ok(payload.files.includes('product/product-overview.md'))
})
