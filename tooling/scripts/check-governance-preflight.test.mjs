delete process.env.SKIP_GOVERNANCE

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const scriptPath = path.join(process.cwd(), 'tooling', 'scripts', 'check-governance-preflight.mjs')
const requiredArtifacts = [
  'README.md',
  'AGENTS.md',
  'EXECUTE.md',
  'docs/CEO_AUDIT_2026-07-23.md',
  'docs/REPOSITORY_STRUCTURE.md',
  'docs/RUNBOOK-BACKUP-RESTORE.md',
  'docs/RUNBOOK-DISASTER-RECOVERY.md',
  'docs/RUNBOOK-MONITORING.md',
  'docs/adr/0001-hybrid-stack.md',
  'docs/adr/0002-data-authority.md',
  'docs/adr/0003-bounded-contexts.md',
  'docs/adr/0004-security-model.md',
  'docs/adr/0005-eventing-model.md',
  'docs/adr/0006-local-governance-authority.md',
]

const authorityText = [
  '# AGENTS.md — ShopSIN / SIN-webshop-01',
  '',
  '## Local Governance Authority',
  '',
  'Versionierte Repository-Dateien sind die einzige Projekt-Autoritaet.',
  'Externe Dokumente duerfen den Repository-Stand nur spiegeln, aber niemals ueberschreiben oder Releases blockieren.',
  'Architekturentscheidungen erfordern einen versionierten ADR und erfolgreiche lokale Gates.',
  '',
  '## Zielbild',
  'Local target.',
  '',
  '## Unveraenderliche Regeln',
  '1. Local rule.',
  '',
  '## Verbindlicher Arbeitsablauf',
  '`pnpm run ci`',
  '',
  '## Release-Gates',
  '`pnpm run ci`',
  '',
  '## Abbruchkriterien',
  'Stop on failed gates.',
  '',
].join('\n')

test('local governance preflight passes without network or external login', async () => {
  const repoDir = await createRepoFixture()
  const { stdout } = await runPreflight(repoDir)
  assert.match(stdout, /Governance preflight passed \(local authority, 15 required artifacts, 3 canonical SSOT files\)\./)
})

test('local governance preflight fails when AGENTS authority sections are missing', async () => {
  const repoDir = await createRepoFixture()
  await fs.writeFile(path.join(repoDir, 'AGENTS.md'), '# incomplete\n', 'utf8')
  await assert.rejects(runPreflight(repoDir), (error) => {
    assert.match(error.stderr, /AGENTS\.md is missing required local-governance sections/)
    return true
  })
})

test('local governance preflight fails when a required artifact is missing', async () => {
  const repoDir = await createRepoFixture()
  await fs.rm(path.join(repoDir, 'EXECUTE.md'))
  await assert.rejects(runPreflight(repoDir), (error) => {
    assert.match(error.stderr, /Required governance artifacts are missing or empty/)
    assert.match(error.stderr, /EXECUTE\.md/)
    return true
  })
})

test('local governance preflight rejects retired external-governance references', async () => {
  const repoDir = await createRepoFixture()
  const retiredProduct = ['Notebook', 'LM'].join('')
  await fs.writeFile(path.join(repoDir, 'docs', 'legacy.txt'), `${retiredProduct} login required\n`, 'utf8')
  await execFileAsync('git', ['add', '.'], { cwd: repoDir })
  await execFileAsync('git', ['commit', '-m', 'legacy reference'], { cwd: repoDir })
  await assert.rejects(runPreflight(repoDir), (error) => {
    assert.match(error.stderr, /Retired external-governance references remain in tracked files/)
    assert.match(error.stderr, /docs\/legacy\.txt/)
    return true
  })
})

test('local governance preflight allows markdown drift', async () => {
  const repoDir = await createRepoFixture()
  await fs.writeFile(path.join(repoDir, 'docs', 'notes.md'), '# changed\n', 'utf8')
  const { stdout } = await runPreflight(repoDir)
  assert.match(stdout, /Governance preflight passed/)
})

test('local governance preflight blocks non-markdown documentation drift', async () => {
  const repoDir = await createRepoFixture()
  await fs.writeFile(path.join(repoDir, 'docs', 'notes.txt'), 'changed\n', 'utf8')
  await assert.rejects(runPreflight(repoDir), (error) => {
    assert.match(error.stderr, /Local documentation drift detected outside Markdown governance/)
    assert.match(error.stderr, /docs\/notes\.txt/)
    return true
  })
})

test('SKIP_GOVERNANCE remains a local-only escape hatch', async () => {
  const repoDir = await createRepoFixture()
  const { stdout } = await runPreflight(repoDir, { SKIP_GOVERNANCE: '1' })
  assert.match(stdout, /skipped locally/)
  await assert.rejects(runPreflight(repoDir, { CI: 'true', SKIP_GOVERNANCE: '1' }), (error) => {
    assert.match(error.stderr, /SKIP_GOVERNANCE is forbidden in CI/)
    return true
  })
})

async function runPreflight(cwd, env = {}) {
  return execFileAsync('node', [scriptPath], {
    cwd,
    env: { ...process.env, CI: 'false', ...env },
  })
}

async function createRepoFixture() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'local-governance-preflight-'))
  await execFileAsync('git', ['init'], { cwd: dir })
  await execFileAsync('git', ['config', 'user.email', 'codex@example.test'], { cwd: dir })
  await execFileAsync('git', ['config', 'user.name', 'Codex'], { cwd: dir })

  for (const relativePath of requiredArtifacts) {
    const absolutePath = path.join(dir, relativePath)
    await fs.mkdir(path.dirname(absolutePath), { recursive: true })
    await fs.writeFile(absolutePath, relativePath === 'AGENTS.md' ? authorityText : `# ${relativePath}\n`, 'utf8')
  }
  const ssotModule = path.join(dir, 'platform', 'governance', 'project-ssot.mjs')
  await fs.mkdir(path.dirname(ssotModule), { recursive: true })
  await fs.writeFile(
    ssotModule,
    "export const PROJECT_SSOT_MARKDOWN_FILES = ['README.md', 'AGENTS.md', 'docs/adr/0006-local-governance-authority.md']\n",
    'utf8',
  )

  await execFileAsync('git', ['add', '.'], { cwd: dir })
  await execFileAsync('git', ['commit', '-m', 'fixture'], { cwd: dir })
  return dir
}
