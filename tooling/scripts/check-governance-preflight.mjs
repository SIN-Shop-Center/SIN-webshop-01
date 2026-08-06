#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { basename, extname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = process.cwd()
const AGENTS_FILE = join(ROOT, 'AGENTS.md')
const SSOT_MODULE = join(ROOT, 'platform', 'governance', 'project-ssot.mjs')
const DOC_EXTENSIONS = new Set(['.adoc', '.mdx', '.rst', '.txt'])
const DOC_BASENAMES = new Set(['ARCHITECTURE', 'CHANGELOG', 'CLOUDFLARE', 'LASTCHANGES', 'STANDARDS_BASELINE'])
const REQUIRED_ARTIFACTS = [
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
  'platform/governance/project-ssot.mjs',
]
const REQUIRED_AGENTS_SECTIONS = [
  '## Local Governance Authority',
  '## Zielbild',
  '## Unveraenderliche Regeln',
  '## Verbindlicher Arbeitsablauf',
  '## Release-Gates',
  '## Abbruchkriterien',
]
const LEGACY_TOKENS = [
  'Notebook' + 'LM',
  'PROJECT_' + 'NOTEBOOK_ID',
  'PROJECT_' + 'NOTEBOOK_SOURCE_ID',
  'nlm ' + 'notebook',
  'nlm ' + 'login',
  '.notebook' + 'lm-mcp-cli',
]

function fail(message, details = '') {
  process.stderr.write(`BLOCKED: ${message}\n`)
  if (details) process.stderr.write(`${details.trimEnd()}\n`)
  process.exit(1)
}

function runGit(args) {
  return spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' })
}

function ensureRequiredArtifacts() {
  const missing = REQUIRED_ARTIFACTS.filter((relativePath) => {
    const absolutePath = join(ROOT, relativePath)
    return !existsSync(absolutePath) || statSync(absolutePath).size === 0
  })
  if (missing.length > 0) {
    fail('Required governance artifacts are missing or empty.', missing.map((entry) => `- ${entry}`).join('\n'))
  }
}

function ensureAgentsContract() {
  const content = readFileSync(AGENTS_FILE, 'utf8')
  const missing = REQUIRED_AGENTS_SECTIONS.filter((section) => !content.includes(section))
  if (missing.length > 0) {
    fail('AGENTS.md is missing required local-governance sections.', missing.map((entry) => `- ${entry}`).join('\n'))
  }
  const authorityMarkers = [
    'Versionierte Repository-Dateien sind die einzige Projekt-Autoritaet.',
    'Externe Dokumente duerfen den Repository-Stand nur spiegeln',
    'Architekturentscheidungen erfordern einen',
  ]
  const missingMarkers = authorityMarkers.filter((marker) => !content.includes(marker))
  if (missingMarkers.length > 0) {
    fail('AGENTS.md is missing local authority invariants.', missingMarkers.map((entry) => `- ${entry}`).join('\n'))
  }
}

async function ensureCanonicalSsotFiles() {
  const moduleUrl = `${pathToFileURL(SSOT_MODULE).href}?governance=${Date.now()}`
  const module = await import(moduleUrl)
  const files = module.PROJECT_SSOT_MARKDOWN_FILES
  if (!Array.isArray(files) || files.length === 0) {
    fail('PROJECT_SSOT_MARKDOWN_FILES must be a non-empty array.')
  }
  const duplicates = files.filter((entry, index) => files.indexOf(entry) !== index)
  if (duplicates.length > 0) {
    fail('Canonical SSOT file list contains duplicates.', [...new Set(duplicates)].map((entry) => `- ${entry}`).join('\n'))
  }
  const missing = files.filter((relativePath) => !existsSync(join(ROOT, relativePath)))
  if (missing.length > 0) {
    fail('Canonical SSOT file list references missing files.', missing.map((entry) => `- ${entry}`).join('\n'))
  }
  return files.length
}

function listTrackedFiles() {
  const result = runGit(['ls-files', '-z'])
  if (result.status !== 0) {
    fail('Unable to list tracked repository files.', [result.stdout, result.stderr].filter(Boolean).join('\n'))
  }
  return result.stdout.split('\0').filter(Boolean)
}

function ensureNoLegacyExternalGovernance() {
  const findings = []
  for (const relativePath of listTrackedFiles()) {
    const absolutePath = join(ROOT, relativePath)
    if (!existsSync(absolutePath) || statSync(absolutePath).size > 2 * 1024 * 1024) continue
    let content
    try {
      content = readFileSync(absolutePath, 'utf8')
    } catch {
      continue
    }
    if (content.includes('\0')) continue
    for (const token of LEGACY_TOKENS) {
      if (content.toLowerCase().includes(token.toLowerCase())) {
        findings.push(`${relativePath}: ${token}`)
      }
    }
  }
  if (findings.length > 0) {
    fail('Retired external-governance references remain in tracked files.', findings.map((entry) => `- ${entry}`).join('\n'))
  }
}

function isBlockedDocPath(relativePath) {
  if (!relativePath || relativePath === 'AGENTS.md') return false
  const extension = extname(relativePath).toLowerCase()
  if (extension === '.md') return false
  if (DOC_EXTENSIONS.has(extension)) return true
  return DOC_BASENAMES.has(basename(relativePath, extension).toUpperCase())
}

function listChangedPaths() {
  const tracked = runGit(['diff', '--name-status', '--relative', 'HEAD'])
  if (tracked.status !== 0) {
    fail('Unable to inspect tracked git changes.', [tracked.stdout, tracked.stderr].filter(Boolean).join('\n'))
  }
  const untracked = runGit(['ls-files', '--others', '--exclude-standard'])
  if (untracked.status !== 0) {
    fail('Unable to inspect untracked git changes.', [untracked.stdout, untracked.stderr].filter(Boolean).join('\n'))
  }
  const trackedEntries = tracked.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [status, ...pathParts] = line.split(/\s+/)
      return { status, path: pathParts.join(' ') }
    })
  const untrackedEntries = untracked.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((filePath) => ({ status: '??', path: filePath }))
  return [...trackedEntries, ...untrackedEntries]
}

function ensureNoBlockedDocDrift() {
  const changedDocs = [...new Set(
    listChangedPaths()
      .filter((entry) => entry.status !== 'D')
      .map((entry) => entry.path)
      .filter(isBlockedDocPath),
  )].sort()
  if (changedDocs.length > 0) {
    fail('Local documentation drift detected outside Markdown governance.', changedDocs.map((entry) => `- ${entry}`).join('\n'))
  }
}

async function main() {
  const skipRequested = process.env.SKIP_GOVERNANCE === '1' || process.env.SKIP_GOVERNANCE === 'true'
  if (skipRequested) {
    if (process.env.CI === 'true') fail('SKIP_GOVERNANCE is forbidden in CI.')
    process.stdout.write('Governance preflight skipped locally (SKIP_GOVERNANCE=1).\n')
    return
  }

  ensureRequiredArtifacts()
  ensureAgentsContract()
  const ssotFileCount = await ensureCanonicalSsotFiles()
  ensureNoLegacyExternalGovernance()
  ensureNoBlockedDocDrift()
  process.stdout.write(`Governance preflight passed (local authority, ${REQUIRED_ARTIFACTS.length} required artifacts, ${ssotFileCount} canonical SSOT files).\n`)
}

main().catch((error) => fail('Governance preflight crashed.', error instanceof Error ? error.stack || error.message : String(error)))
