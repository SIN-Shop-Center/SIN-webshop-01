#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import { basename, extname, join } from 'node:path'

const ROOT = process.cwd()
const AGENTS_FILE = join(ROOT, 'AGENTS.md')
const NLM_BIN = process.env.NLM_BIN || 'nlm'
const DEFAULT_NLM_STORAGE_DIR = join(ROOT, '.notebooklm-mcp-cli')
const LEGACY_NLM_STORAGE_DIR = join(os.homedir(), '.notebooklm-mcp-cli')
const DOC_EXTENSIONS = new Set(['.adoc', '.mdx', '.rst', '.txt'])
const DOC_BASENAMES = new Set(['ARCHITECTURE', 'CHANGELOG', 'CLOUDFLARE', 'LASTCHANGES', 'STANDARDS_BASELINE'])
const QUERY_RETRIES = Number.parseInt(process.env.NLM_QUERY_RETRIES || '2', 10)
const QUERY_RETRY_DELAY_MS = Number.parseInt(process.env.NLM_QUERY_RETRY_DELAY_MS || '3000', 10)

function fail(message, details = '') {
  process.stderr.write(`BLOCKED: ${message}\n`)
  if (details) {
    process.stderr.write(`${details.trimEnd()}\n`)
  }
  process.exit(1)
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    env: buildNlmEnv(),
    ...options,
  })
}

function getNlmStorageDir() {
  return process.env.NOTEBOOKLM_MCP_CLI_PATH || DEFAULT_NLM_STORAGE_DIR
}

function getPreflightCachePath() {
  return join(getNlmStorageDir(), 'preflight-cache.json')
}

function getGovernanceSummaryCachePath() {
  return join(getNlmStorageDir(), 'governance-preflight-cache.json')
}

function buildNlmEnv() {
  return {
    ...process.env,
    NOTEBOOKLM_MCP_CLI_PATH: getNlmStorageDir(),
  }
}

function parseAgentsConfig() {
  if (!existsSync(AGENTS_FILE)) {
    fail('Missing AGENTS.md in project root.')
  }

  const content = readFileSync(AGENTS_FILE, 'utf8')
  const notebookId = content.match(/PROJECT_NOTEBOOK_ID=([^\s`]+)/)?.[1] || ''
  const sourceCountRaw = content.match(/SOURCE_COUNT_REQUIRED=(\d+)/)?.[1] || ''
  const sourceCountRequired = Number.parseInt(sourceCountRaw, 10)
  const mandatoryQueries = [...content.matchAll(/nlm notebook query "\$PROJECT_NOTEBOOK_ID" "([^"]+)" --json/g)].map((match) => match[1])

  if (!notebookId) {
    fail('AGENTS.md is missing PROJECT_NOTEBOOK_ID.')
  }
  if (!Number.isInteger(sourceCountRequired) || sourceCountRequired < 1) {
    fail('AGENTS.md is missing a valid SOURCE_COUNT_REQUIRED.')
  }
  if (mandatoryQueries.length === 0) {
    fail('AGENTS.md is missing mandatory NotebookLM queries.')
  }

  return {
    agentsHash: createHash('sha256').update(content).digest('hex'),
    mandatoryQueries,
    notebookId,
    sourceCountRequired,
  }
}

function bootstrapLocalNlmProfile() {
  const storageDir = getNlmStorageDir()
  const targetProfileDir = join(storageDir, 'profiles', 'default')
  const targetCookies = join(targetProfileDir, 'cookies.json')
  const targetMetadata = join(targetProfileDir, 'metadata.json')

  if (existsSync(targetCookies) && existsSync(targetMetadata)) {
    return
  }

  const sourceProfileDir = join(LEGACY_NLM_STORAGE_DIR, 'profiles', 'default')
  const sourceCookies = join(sourceProfileDir, 'cookies.json')
  const sourceMetadata = join(sourceProfileDir, 'metadata.json')
  if (!existsSync(sourceCookies)) {
    return
  }

  mkdirSync(targetProfileDir, { recursive: true, mode: 0o700 })
  copyFileSync(sourceCookies, targetCookies)
  if (existsSync(sourceMetadata)) {
    copyFileSync(sourceMetadata, targetMetadata)
  }
}

function ensureNlmAvailable() {
  const version = run(NLM_BIN, ['--version'])
  if (version.status !== 0) {
    fail(
      'NotebookLM CLI is unavailable.',
      [version.stdout, version.stderr].filter(Boolean).join('\n') || `Unable to execute ${NLM_BIN}.`,
    )
  }
}

function ensureNlmLogin() {
  const login = run(NLM_BIN, ['login', '--check'])
  if (login.status !== 0) {
    fail(
      'NotebookLM login check failed.',
      [login.stdout, login.stderr].filter(Boolean).join('\n') || `Command exited with status ${login.status ?? 'unknown'}.`,
    )
  }
}

function tryRunJson(command, args, options = {}) {
  const retries = Number.isInteger(options.retries) ? options.retries : 0
  const retryDelayMs = Number.isInteger(options.retryDelayMs) ? options.retryDelayMs : 2000

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const result = run(command, args)
    if (result.status === 0) {
      try {
        return { ok: true, payload: JSON.parse(result.stdout) }
      } catch (error) {
        return {
          ok: false,
          details: `Invalid JSON response.\n${error instanceof Error ? error.message : String(error)}`,
          resourceExhausted: false,
        }
      }
    }

    const details = [result.stdout, result.stderr].filter(Boolean).join('\n') || `Command exited with status ${result.status ?? 'unknown'}.`
    const resourceExhausted = details.includes('RESOURCE_EXHAUSTED')
    if (resourceExhausted && attempt < retries) {
      sleep(retryDelayMs * (attempt + 1))
      continue
    }

    return { ok: false, details, resourceExhausted }
  }

  return { ok: false, details: 'Unknown NotebookLM failure.', resourceExhausted: false }
}

function runJson(command, args, blockedMessage, options = {}) {
  const result = tryRunJson(command, args, options)
  if (!result.ok) {
    fail(blockedMessage, result.details)
  }
  return result.payload
}

function ensureNotebookBinding(config) {
  const notebook = runJson(
    NLM_BIN,
    ['notebook', 'get', config.notebookId, '--json'],
    'NotebookLM notebook lookup failed.',
  )
  const sources = runJson(
    NLM_BIN,
    ['source', 'list', config.notebookId, '--json'],
    'NotebookLM source lookup failed.',
  )

  const notebookValue = notebook?.value
  if (!notebookValue || typeof notebookValue !== 'object') {
    fail('NotebookLM notebook lookup returned no value payload.')
  }

  const notebookSourceCount = Number.parseInt(String(notebookValue.source_count ?? ''), 10)
  const notebookSources = Array.isArray(notebookValue.sources) ? notebookValue.sources : []
  const sourceList = Array.isArray(sources) ? sources : []

  if (notebookSourceCount !== config.sourceCountRequired) {
    fail(
      'NotebookLM notebook is not bound to the required source count.',
      `Expected ${config.sourceCountRequired}, got ${notebookSourceCount || 0}.`,
    )
  }
  if (notebookSources.length !== config.sourceCountRequired || sourceList.length !== config.sourceCountRequired) {
    fail(
      'NotebookLM notebook/source metadata is inconsistent.',
      `Notebook reported ${notebookSources.length} sources, source list returned ${sourceList.length}.`,
    )
  }

  const invalidSources = sourceList.filter((source) => source?.type !== 'google_docs')
  if (invalidSources.length > 0) {
    fail(
      'NotebookLM notebook contains non-Google-Docs sources.',
      invalidSources.map((source) => `- ${source.id || 'unknown'} (${source.type || 'unknown'})`).join('\n'),
    )
  }

  return new Set(sourceList.map((source) => source.id).filter(Boolean))
}

function countCitations(queryPayload) {
  const citations = queryPayload?.value?.citations
  if (Array.isArray(citations)) {
    return citations.length
  }
  if (citations && typeof citations === 'object') {
    return Object.keys(citations).length
  }
  return 0
}

function loadGovernanceSummaryCaches() {
  const candidates = [getGovernanceSummaryCachePath(), getPreflightCachePath()]
  const out = []
  for (const cachePath of candidates) {
    if (!existsSync(cachePath)) {
      continue
    }
    try {
      const parsed = JSON.parse(readFileSync(cachePath, 'utf8'))
      const normalized = normalizeGovernanceSummaryCache(parsed)
      if (normalized) {
        out.push(normalized)
      }
    } catch {
      // ignore broken cache files and keep looking
    }
  }
  return out
}

function normalizeGovernanceSummaryCache(cache) {
  if (!cache || typeof cache !== 'object') {
    return null
  }

  if (cache.generatedAt && cache.entries) {
    return cache
  }

  if (!cache.updatedAt || !cache.queries || typeof cache.queries !== 'object') {
    return null
  }

  const entries = Object.fromEntries(
    Object.entries(cache.queries).map(([question, payload]) => [
      question,
      {
        citationCount: countCitations({ value: payload }),
        sourcesUsed: Array.isArray(payload?.sources_used) ? payload.sources_used.filter(Boolean) : [],
        verifiedAt: String(cache.updatedAt),
      },
    ]),
  )

  return {
    generatedAt: String(cache.updatedAt),
    notebookId: String(cache.notebookId || ''),
    sourceCountRequired: Number.parseInt(String(cache.sourceCountRequired || '0'), 10),
    sourceIds: Array.isArray(cache.sourceIds) ? cache.sourceIds.filter(Boolean).map(String) : [],
    entries,
  }
}

function getGovernanceSummaryCacheViolation(cache, config, allowedSourceIds) {
  if (!cache || typeof cache !== 'object') {
    return 'Missing or invalid governance summary cache.'
  }

  const generatedAt = Date.parse(String(cache.generatedAt || ''))
  if (!Number.isFinite(generatedAt)) {
    return 'Governance summary cache is missing a valid generatedAt timestamp.'
  }
  const maxAgeMs = 7 * 24 * 60 * 60 * 1000
  if (Date.now() - generatedAt > maxAgeMs) {
    return 'Governance summary cache is too old to be used as evidence.'
  }

  if (String(cache.notebookId || '') !== config.notebookId) {
    return 'Governance summary cache notebookId does not match AGENTS.md.'
  }

  const cachedSourceCount = Number.parseInt(String(cache.sourceCountRequired || ''), 10)
  if (cachedSourceCount !== config.sourceCountRequired) {
    return 'Governance summary cache sourceCountRequired does not match AGENTS.md.'
  }

  const expectedSourceIds = [...allowedSourceIds].sort()
  const cachedSourceIds = Array.isArray(cache.sourceIds) ? cache.sourceIds.filter(Boolean).map(String).sort() : []
  if (cachedSourceIds.length !== expectedSourceIds.length || cachedSourceIds.join(',') !== expectedSourceIds.join(',')) {
    return 'Governance summary cache sourceIds do not match the notebook binding.'
  }

  const entries = cache.entries
  if (!entries || typeof entries !== 'object') {
    return 'Governance summary cache entries are missing.'
  }

  for (const question of config.mandatoryQueries) {
    const entry = entries[question]
    if (!entry || typeof entry !== 'object') {
      return `Governance summary cache is missing entry for mandatory query: ${question}`
    }
    const citationCount = Number.parseInt(String(entry.citationCount || '0'), 10)
    if (!Number.isFinite(citationCount) || citationCount < 1) {
      return `Governance summary cache is missing citation evidence for mandatory query: ${question}`
    }
    const sourcesUsed = Array.isArray(entry.sourcesUsed) ? entry.sourcesUsed.filter(Boolean).map(String) : []
    const uniqueSourcesUsed = [...new Set(sourcesUsed)]
    if (uniqueSourcesUsed.length !== config.sourceCountRequired) {
      return `Governance summary cache source evidence does not match required source count for query: ${question}`
    }
    const invalidSources = uniqueSourcesUsed.filter((sourceId) => !allowedSourceIds.has(sourceId))
    if (invalidSources.length > 0) {
      return `Governance summary cache references unexpected sources for query: ${question}`
    }
  }

  return ''
}

function getQueryEvidenceViolation(queryPayload, question, config, allowedSourceIds) {
  const answer = String(queryPayload?.value?.answer || '').trim()
  const citationCount = countCitations(queryPayload)
  const sourcesUsed = Array.isArray(queryPayload?.value?.sources_used) ? queryPayload.value.sources_used.filter(Boolean) : []
  const uniqueSourcesUsed = [...new Set(sourcesUsed)]
  const invalidSources = uniqueSourcesUsed.filter((sourceId) => !allowedSourceIds.has(sourceId))

  if (!answer) {
    return `Mandatory NotebookLM query returned no answer.\nQuestion: ${question}`
  }
  if (citationCount < 1) {
    return `Missing citation evidence from mandatory NotebookLM query.\nQuestion: ${question}`
  }
  if (uniqueSourcesUsed.length < 1) {
    return `Mandatory NotebookLM query returned no sources_used evidence.\nQuestion: ${question}`
  }
  if (uniqueSourcesUsed.length !== config.sourceCountRequired) {
    return `Mandatory NotebookLM query did not honor the required source count.\nQuestion: ${question}\nExpected ${config.sourceCountRequired}, got ${uniqueSourcesUsed.length}.`
  }
  if (invalidSources.length > 0) {
    return ['Mandatory NotebookLM query used unexpected sources.', `Question: ${question}`, ...invalidSources.map((sourceId) => `- ${sourceId}`)].join('\n')
  }

  return ''
}

function writeEvidenceCache(cache) {
  const storageDir = getNlmStorageDir()
  mkdirSync(storageDir, { recursive: true, mode: 0o700 })
  writeFileSync(getPreflightCachePath(), `${JSON.stringify(cache, null, 2)}\n`, 'utf8')
}

function writeGovernanceSummaryCache(cache) {
  const storageDir = getNlmStorageDir()
  mkdirSync(storageDir, { recursive: true, mode: 0o700 })
  writeFileSync(getGovernanceSummaryCachePath(), `${JSON.stringify(cache, null, 2)}\n`, 'utf8')
}

function ensureMandatoryQueries(config, allowedSourceIds) {
  const sourceIds = [...allowedSourceIds].sort()

  const existingSummaryCache = loadGovernanceSummaryCaches().find(
    (cache) => !getGovernanceSummaryCacheViolation(cache, config, allowedSourceIds),
  )
  if (existingSummaryCache) {
    process.stdout.write('Using cached evidence snapshot.\n')
    return
  }

  const nextCache = {
    agentsHash: config.agentsHash,
    notebookId: config.notebookId,
    sourceCountRequired: config.sourceCountRequired,
    sourceIds,
    updatedAt: new Date().toISOString(),
    queries: {},
  }
  const summaryCache = {
    generatedAt: new Date().toISOString(),
    notebookId: config.notebookId,
    sourceCountRequired: config.sourceCountRequired,
    sourceIds,
    entries: {},
  }

  let conversationId = ''
  for (const question of config.mandatoryQueries) {
    const queryArgs = ['notebook', 'query', config.notebookId, question, '--json', '--timeout', '180', '--source-ids', sourceIds.join(',')]
    if (conversationId) {
      queryArgs.push('--conversation-id', conversationId)
    }

    const result = tryRunJson(NLM_BIN, queryArgs, {
      retries: Number.isInteger(QUERY_RETRIES) && QUERY_RETRIES >= 0 ? QUERY_RETRIES : 2,
      retryDelayMs: Number.isInteger(QUERY_RETRY_DELAY_MS) && QUERY_RETRY_DELAY_MS >= 0 ? QUERY_RETRY_DELAY_MS : 3000,
    })
    if (!result.ok) {
      if (result.resourceExhausted) {
        const cachedSummary = loadGovernanceSummaryCaches().find(
          (cache) => !getGovernanceSummaryCacheViolation(cache, config, allowedSourceIds),
        )
        if (cachedSummary) {
          process.stdout.write('NotebookLM quota exhausted; using cached evidence snapshot.\n')
          return
        }
      }
      fail('Mandatory NotebookLM query failed.', `Question: ${question}\n${result.details}`)
    }

    const payload = result.payload
    const violation = getQueryEvidenceViolation(payload, question, config, allowedSourceIds)
    if (violation) {
      fail('Mandatory NotebookLM query failed.', violation)
    }

    conversationId = String(payload?.value?.conversation_id || conversationId).trim()
    nextCache.queries[question] = payload.value
    summaryCache.entries[question] = {
      citationCount: countCitations(payload),
      sourcesUsed: Array.isArray(payload?.value?.sources_used) ? payload.value.sources_used.filter(Boolean) : [],
      verifiedAt: new Date().toISOString(),
    }
  }

  nextCache.updatedAt = new Date().toISOString()
  summaryCache.generatedAt = nextCache.updatedAt
  writeEvidenceCache(nextCache)
  writeGovernanceSummaryCache(summaryCache)
}

function isBlockedDocPath(relativePath) {
  if (!relativePath || relativePath === 'AGENTS.md') {
    return false
  }
  const extension = extname(relativePath).toLowerCase()
  if (extension === '.md') {
    return false
  }
  if (DOC_EXTENSIONS.has(extension)) {
    return true
  }
  const baseWithoutExtension = basename(relativePath, extension).toUpperCase()
  return DOC_BASENAMES.has(baseWithoutExtension)
}

function listChangedPaths() {
  const tracked = run('git', ['diff', '--name-status', '--relative', 'HEAD'])
  if (tracked.status !== 0) {
    fail('Unable to inspect tracked git changes.', [tracked.stdout, tracked.stderr].filter(Boolean).join('\n'))
  }
  const untracked = run('git', ['ls-files', '--others', '--exclude-standard'])
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
    fail(
      'Local documentation drift detected outside AGENTS.md.',
      changedDocs.map((filePath) => `- ${filePath}`).join('\n'),
    )
  }
}

function main() {
  if (process.env.SKIP_GOVERNANCE === '1' || process.env.SKIP_GOVERNANCE === 'true') {
    process.stdout.write('Governance preflight skipped (SKIP_GOVERNANCE=1).\n')
    return
  }

  const config = parseAgentsConfig()
  ensureNoBlockedDocDrift()
  bootstrapLocalNlmProfile()
  ensureNlmAvailable()
  ensureNlmLogin()
  const allowedSourceIds = ensureNotebookBinding(config)
  ensureMandatoryQueries(config, allowedSourceIds)
  process.stdout.write(`Governance preflight passed (${config.mandatoryQueries.length} mandatory queries, source_count=${config.sourceCountRequired}).\n`)
}

main()
