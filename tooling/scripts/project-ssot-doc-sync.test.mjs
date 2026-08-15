import test from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'

const execFileAsync = promisify(execFile)
const cwd = process.cwd()

test('project SSOT sync dry-run reports the canonical markdown mirror set', async () => {
  const scriptPath = path.join(cwd, 'tooling', 'scripts', 'sync-project-ssot-doc.mjs')
  const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
    cwd,
    maxBuffer: 10 * 1024 * 1024,
  })

  const payload = JSON.parse(stdout)
  assert.equal(payload.documentTitle, 'SIN-webshop-01 - Collaboration Mirror')
  assert.equal(payload.rootTabTitle, '00_INDEX')
  assert.equal(payload.fileCount, payload.files.length)
  assert.ok(payload.files.includes('README.md'))
  assert.ok(payload.files.includes('AGENTS.md'))
  assert.ok(payload.files.includes('docs/go-live-today-checklist.md'))
  assert.ok(payload.files.includes('docs/product/product-overview.md'))
  assert.ok(payload.files.includes('docs/adr/0006-local-governance-authority.md'))
  assert.equal('notebookId' in payload, false)
  assert.equal('sourceId' in payload, false)
})
