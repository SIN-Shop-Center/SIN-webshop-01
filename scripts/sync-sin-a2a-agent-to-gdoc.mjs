#!/usr/bin/env node

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import {
  findGoogleDocTabById as findGoogleDocTabByIdShared,
  fetchGoogleDocument as fetchGoogleDocumentShared,
  batchUpdateGoogleDocument as batchUpdateGoogleDocumentShared,
  loadGoogleServiceAccount as loadGoogleServiceAccountShared,
  requestGoogleAccessToken as requestGoogleAccessTokenShared,
} from './lib/google-api.mjs'
import { hasFlag, loadLocalEnvFiles, readArgValue } from './lib/cli-env.mjs'

const DOCS_SCOPE = 'https://www.googleapis.com/auth/documents'
const defaultServiceAccountFile = path.join(os.homedir(), 'dev', 'Meine-Google-Credentials', 'credentials.json')
const defaultRegistryFile = path.join(process.cwd(), 'config', 'sin-a2a', 'registry.json')

async function main() {
  loadLocalEnvFiles()

  const dryRun = hasFlag('--dry-run')
  const agentSlug = String(readArgValue('--agent') || 'sin-passwordmanager').trim()
  const registryFile = path.resolve(readArgValue('--registry-file') || defaultRegistryFile)
  const registry = JSON.parse(await fs.readFile(registryFile, 'utf8'))
  const agent = registry.agents.find((entry) => entry.slug === agentSlug)
  if (!agent) {
    throw new Error(`agent_not_found:${agentSlug}`)
  }

  const content = await buildAgentDocBlock({ registry, agent })
  if (dryRun) {
    process.stdout.write(content)
    return
  }

  const serviceAccount = loadGoogleServiceAccountShared({
    filePath: readArgValue('--service-account') || process.env.GOOGLE_SERVICE_ACCOUNT_FILE || defaultServiceAccountFile,
    fallbackFilePath: defaultServiceAccountFile,
  })
  const accessToken = await requestGoogleAccessTokenShared({ serviceAccount, scopes: [DOCS_SCOPE] })
  const document = await fetchGoogleDocumentShared({
    documentId: agent.googleDocs.documentId,
    accessToken,
    includeTabsContent: true,
  })
  const tab = findGoogleDocTabByIdShared(document.tabs || [], agent.googleDocs.agentTabId)
  if (!tab) {
    throw new Error(`google_doc_tab_not_found:${agent.googleDocs.agentTabId}`)
  }

  const bodyContent = tab.documentTab?.body?.content || []
  const headingEndIndex = Number(bodyContent[1]?.endIndex || 1)
  const lastEndIndex = Number(bodyContent[bodyContent.length - 1]?.endIndex || headingEndIndex + 1)
  const requests = []

  if (lastEndIndex - 1 > headingEndIndex) {
    requests.push({
      deleteContentRange: {
        range: {
          startIndex: headingEndIndex,
          endIndex: lastEndIndex - 1,
          tabId: agent.googleDocs.agentTabId,
        },
      },
    })
  }

  requests.push({
    insertText: {
      location: {
        index: headingEndIndex,
        tabId: agent.googleDocs.agentTabId,
      },
      text: content,
    },
  })

  await batchUpdateGoogleDocumentShared({
    documentId: agent.googleDocs.documentId,
    accessToken,
    requests,
  })
  process.stdout.write(`OK: synced ${agent.name} to Google Doc tab ${agent.googleDocs.agentTabId}\n`)
}

async function buildAgentDocBlock({ registry, agent }) {
  const team = registry.teams.find((entry) => entry.id === agent.teamId)
  const agentRoot = resolveUserPath(agent.paths.agentRoot)
  const a2aRuntimeRoot = resolveUserPath(agent.paths.a2aRuntime)
  const mcpRuntimeRoot = resolveUserPath(agent.paths.mcpRuntime)
  const coreRoot = resolveUserPath(agent.paths.core)
  const rootPackageFile = path.join(process.cwd(), 'package.json')

  const [
    agentCard,
    manifest,
    mcpConfig,
    constitution,
    a2aSource,
    mcpSource,
    coreConfigSource,
    storeSource,
    providersSource,
    rootPackage,
    fileGroups,
  ] = await Promise.all([
    readJsonIfExists(path.join(agentRoot, 'agent.json')),
    readJsonIfExists(path.join(agentRoot, 'deploy', 'manifest.json')),
    readJsonIfExists(path.join(agentRoot, 'mcp-config.json')),
    readTextIfExists(path.join(agentRoot, 'AGENTS.md')),
    readTextIfExists(path.join(a2aRuntimeRoot, 'src', 'server.mjs')),
    readTextIfExists(path.join(mcpRuntimeRoot, 'src', 'server.mjs')),
    readTextIfExists(path.join(coreRoot, 'src', 'config.mjs')),
    readTextIfExists(path.join(coreRoot, 'src', 'store.mjs')),
    readTextIfExists(path.join(coreRoot, 'src', 'providers.mjs')),
    readJsonIfExists(rootPackageFile),
    collectGroupedFiles([
      { label: 'Agent Root', root: agent.paths.agentRoot },
      { label: 'A2A Runtime', root: agent.paths.a2aRuntime },
      { label: 'MCP Runtime', root: agent.paths.mcpRuntime },
      { label: 'Core Package', root: agent.paths.core },
    ]),
  ])

  const a2aActions = extractUniqueMatches(a2aSource, /case '([^']+)'/g).filter((entry) => entry !== 'help')
  const a2aTaskStates = extractUniqueMatches(a2aSource, /state: '([^']+)'/g)
  const mcpTools = extractUniqueMatches(mcpSource, /registerTool\(\s*'([^']+)'/g)
  const mcpPrompts = extractUniqueMatches(mcpSource, /registerPrompt\(\s*'([^']+)'/g)
  const targetKinds = extractEnumMembers(storeSource, /kind:\s*z\.enum\(\[([\s\S]*?)\]\)/g)
  const envVars = unique([
    ...extractUniqueMatches(a2aSource, /process\.env\.([A-Z0-9_]+)/g),
    ...extractUniqueMatches(mcpSource, /process\.env\.([A-Z0-9_]+)/g),
    ...extractUniqueMatches(coreConfigSource, /process\.env\.([A-Z0-9_]+)/g),
  ])
  const mcpResources = extractMcpResourceUris(mcpSource)
  const constititionPoints = extractConstitutionPoints(constitution)
  const packageScripts = rootPackage?.scripts || {}
  const knownCommands = unique([
    ...agent.commands,
    ...Object.entries(packageScripts)
      .filter(([name]) => name.startsWith('spm:') || name.startsWith('sin-a2a:') || name.startsWith('hf:'))
      .map(([name]) => `pnpm ${name}`),
  ])
  const skills = await collectSkillSummaries(path.join(agentRoot, 'skills'))
  const stateDirDefault = '~/.simone-spm'
  const defaultBackend = process.platform === 'darwin' ? 'keychain' : 'file'
  const lines = [
    '',
    'SIN_A2A_AGENT_DOC_V2',
    '',
    '1. Agent Overview',
    `- Agent Name: ${agent.name}`,
    `- Short Name: ${agent.shortName}`,
    `- Agent ID: ${agent.id}`,
    `- Team: ${team?.name || agent.teamId}`,
    `- Team Path: ${team?.departmentPath || agent.teamId}`,
    `- Status: ${agent.status}`,
    `- Workspace: ${registry.workspace?.name || 'SIN Silicon Workforce'}`,
    `- Purpose: ${agent.description}`,
    '',
    '2. Mission and Operational Scope',
    '- SPM is the central secret authority for the Simone stack.',
    '- It stores secret values, maintains non-sensitive metadata, binds provider targets, and fans out deterministic secret writes.',
    '- The current fanout targets are GitHub Actions repository secrets, Cloudflare Worker runtime secrets, and Vercel project environment variables.',
    '- SOPS+age is legacy import-only; new write and sync operations flow through SPM.',
    '',
    '3. Public Hosts and Surfaces',
    `- Workforce Directory Card: https://${registry.workspace?.indexHost || 'a2a.delqhi.com'}${registry.workspace?.indexRoute || '/a2a'}`,
    `- Guide: https://${agent.guide.host}`,
    `- A2A Host: https://${agent.a2a.host}`,
    `- A2A JSON-RPC Endpoint: https://${agent.a2a.host}${agent.a2a.jsonRpcPath}`,
    `- A2A REST Endpoint: https://${agent.a2a.host}${agent.a2a.restPath}`,
    `- Agent Card Endpoint: https://${agent.a2a.host}${agent.a2a.agentCardWellKnownPath || '/.well-known/agent-card.json'}`,
    `- Legacy Agent Card Alias: https://${agent.a2a.host}${agent.a2a.cardPath}`,
    `- OAuth Client Metadata: https://${agent.a2a.host}${agent.a2a.oauthClientPath}`,
    `- MCP Host: https://${agent.mcp.host}`,
    `- MCP HTTP Endpoint: https://${agent.mcp.host}${agent.mcp.path}`,
    `- Health Endpoint: https://${agent.a2a.host}/health`,
    '',
    '4. Google Docs Mapping',
    `- Document ID: ${agent.googleDocs.documentId}`,
    `- Reference Tab: ${agent.googleDocs.referenceTabId}`,
    `- Teams Root Tab: ${agent.googleDocs.teamsRootTabId}`,
    `- Team Tab: ${agent.googleDocs.teamTabId}`,
    `- Agent Tab: ${agent.googleDocs.agentTabId}`,
    '',
    '5. Agent Card and A2A Runtime',
    `- Protocol Version: ${agentCard?.protocolVersion || 'unknown'}`,
    `- Runtime Version: ${agentCard?.version || 'unknown'}`,
    `- Preferred Transport: ${agentCard?.preferredTransport || 'JSONRPC'}`,
    `- Base URL: ${agent.a2a.baseUrl}`,
    `- Runtime Port: ${agent.a2a.port}`,
    `- Streaming Enabled: ${Boolean(agentCard?.capabilities?.streaming)}`,
    `- Push Notifications Enabled: ${Boolean(agentCard?.capabilities?.pushNotifications)}`,
    `- Incremental Artifacts Enabled: ${Boolean(agentCard?.capabilities?.incrementalArtifacts)}`,
    `- Default Input Modes: ${Array.isArray(agentCard?.defaultInputModes) ? agentCard.defaultInputModes.join(', ') : 'text'}`,
    `- Default Output Modes: ${Array.isArray(agentCard?.defaultOutputModes) ? agentCard.defaultOutputModes.join(', ') : 'text'}`,
    '',
    'A2A Task Lifecycle',
    ...a2aTaskStates.map((entry) => `- ${entry}`),
    '',
    'A2A Supported Actions',
    ...a2aActions.map((entry) => `- ${entry}`),
    '',
    'A2A Example Commands',
    '- {"action":"list_secrets"}',
    '- {"action":"get_secret","name":"CLOUDFLARE_API_TOKEN","reveal":false}',
    '- {"action":"put_secret","name":"CLOUDFLARE_API_TOKEN","value":"<value>","description":"Cloudflare deployment token"}',
    '- {"action":"bind_target","name":"CLOUDFLARE_API_TOKEN","target":{"id":"worker-main","kind":"cloudflare_worker_secret","authSecretName":"CLOUDFLARE_API_TOKEN","params":{"accountId":"<account-id>","scriptName":"<worker-name>"}}}',
    '- {"action":"sync_secret","name":"CLOUDFLARE_API_TOKEN"}',
    '- {"action":"sync_all_secrets"}',
    '',
    '6. MCP Runtime and Tool Surface',
    `- MCP Transport Modes: ${Array.isArray(agent.mcp.transport) ? agent.mcp.transport.join(', ') : 'stdio'}`,
    `- MCP Base URL: ${agent.mcp.baseUrl}`,
    `- MCP Port: ${agent.mcp.port}`,
    `- MCP Config Aliases: ${Object.keys(mcpConfig?.mcpServers || {}).join(', ') || 'none'}`,
    '',
    'MCP Tools',
    ...mcpTools.map((entry) => `- ${entry}`),
    '',
    'MCP Resources',
    ...mcpResources.map((entry) => `- ${entry}`),
    '',
    'MCP Prompts',
    ...mcpPrompts.map((entry) => `- ${entry}`),
    '',
    '7. Secret Storage Architecture',
    `- Default Backend on this machine family: ${defaultBackend}`,
    `- Backend Selection Rule: SPM_SECRET_BACKEND or automatic default (darwin=keychain, others=file)`,
    `- Default State Directory: ${stateDirDefault}`,
    '- Catalog stores metadata only and does not persist plaintext secret values in the repo.',
    '- Keychain backend uses the configured service name to persist values outside the repo.',
    '- File backend writes into the encrypted vault file under the SPM state directory and requires a master key.',
    '- Secret values are masked in standard metadata responses and only revealed on explicit request.',
    '',
    'Supported Target Kinds',
    ...targetKinds.map((entry) => `- ${entry}`),
    '',
    '8. Provider Sync Behaviour',
    '- GitHub Actions sync uses `gh secret set` with GH_TOKEN/GITHUB_TOKEN injected from the bound auth secret.',
    '- Cloudflare Worker sync calls the Workers secrets REST endpoint and writes `secret_text` values to one script.',
    '- Vercel sync calls the project env API and upserts encrypted environment variables to one or more targets.',
    '- Sync operations run one target at a time and return deterministic per-target result objects.',
    '',
    '9. Skills',
    ...(skills.length > 0
      ? skills.flatMap((entry) => [`- ${entry.name}`, `  Description: ${entry.description}`])
      : agent.skills.map((entry) => `- ${entry}`)),
    '',
    '10. Commands and Operator Entry Points',
    ...knownCommands.map((entry) => `- ${entry}`),
    '',
    '11. Runtime Environment Variables',
    ...envVars.map((entry) => `- ${entry}`),
    '',
    '12. Deploy Targets and External Footprint',
    `- GitHub Repo: ${agent.repo.name} (${agent.repo.status})`,
    `- Hugging Face Space: ${agent.huggingFaceSpace.owner}/${agent.huggingFaceSpace.slug} (${agent.huggingFaceSpace.hardware}, ${agent.huggingFaceSpace.status})`,
    `- Guide Hostname: ${agent.cloudflare.directoryHostname}`,
    `- A2A Hostname: ${agent.cloudflare.a2aHostname}`,
    `- MCP Hostname: ${agent.cloudflare.mcpHostname}`,
    `- Manifest Agent ID: ${manifest?.agentId || agent.id}`,
    `- Manifest Team: ${manifest?.team || agent.teamId}`,
    '',
    '13. Repository and Runtime Paths',
    `- Agent Root: ${agent.paths.agentRoot}`,
    `- A2A Runtime: ${agent.paths.a2aRuntime}`,
    `- MCP Runtime: ${agent.paths.mcpRuntime}`,
    `- Core Package: ${agent.paths.core}`,
    '',
    '14. Full File Inventory',
    ...renderGroupedFiles(fileGroups),
    '',
    '15. Constitution and Operating Rules',
    ...constititionPoints.map((entry) => `- ${entry}`),
    '',
    '16. Provider Implementation Notes',
    '- GitHub target params: owner, repo, optional secretName.',
    '- Cloudflare target params: accountId, scriptName, optional secretName.',
    '- Vercel target params: projectId, optional secretName, optional teamId, gitBranch, targets, upsert.',
    '- Auth fanout requires the auth secret referenced by `authSecretName` to already exist in SPM.',
    '',
    '17. Operational Status',
    '- A2A runtime is implemented.',
    '- MCP runtime is implemented in stdio and streamable HTTP modes.',
    '- Workforce listing and guide route are implemented in the web app.',
    '- GitHub repo, Hugging Face Space and Cloudflare public deployment are scaffolded and can be promoted live from the recorded manifest.',
    '',
  ]
  return `${lines.join('\n')}\n`
}

async function readTextIfExists(file) {
  try {
    return await fs.readFile(file, 'utf8')
  } catch {
    return ''
  }
}

async function readJsonIfExists(file) {
  const text = await readTextIfExists(file)
  if (!text) {
    return null
  }
  return JSON.parse(text)
}

function resolveUserPath(inputPath) {
  const raw = String(inputPath || '').trim()
  if (!raw) {
    return process.cwd()
  }
  if (raw.startsWith('~/')) {
    return path.join(os.homedir(), raw.slice(2))
  }
  return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw)
}

function extractUniqueMatches(text, pattern) {
  const values = []
  if (!text) {
    return values
  }
  for (const match of text.matchAll(pattern)) {
    const value = String(match[1] || '').trim()
    if (value) {
      values.push(value)
    }
  }
  return unique(values)
}

function extractEnumMembers(text, pattern) {
  const groups = extractUniqueMatches(text, pattern)
  if (groups.length === 0) {
    return []
  }
  const values = []
  for (const group of groups) {
    for (const match of group.matchAll(/'([^']+)'/g)) {
      const value = String(match[1] || '').trim()
      if (value) {
        values.push(value)
      }
    }
  }
  return unique(values)
}

function extractMcpResourceUris(text) {
  if (!text) {
    return []
  }
  const values = []
  for (const match of text.matchAll(/registerResource\(\s*'[^']+',\s*(?:'([^']+)'|new ResourceTemplate\('([^']+)')/g)) {
    const value = String(match[1] || match[2] || '').trim()
    if (value) {
      values.push(value)
    }
  }
  return unique(values)
}

function extractConstitutionPoints(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim())
}

async function collectGroupedFiles(groups) {
  const out = []
  for (const group of groups) {
    const resolvedRoot = resolveUserPath(group.root)
    const displayRoot = String(group.root || '').replaceAll(path.sep, '/')
    const files = await collectFiles(resolvedRoot)
    out.push({
      label: group.label,
      root: group.root,
      files: files.map((entry) => path.posix.join(displayRoot, entry.split(path.sep).join('/'))),
    })
  }
  return out
}

async function collectFiles(root) {
  try {
    const stat = await fs.stat(root)
    if (!stat.isDirectory()) {
      return []
    }
  } catch {
    return []
  }

  const out = []

  async function walk(current, prefix = '') {
    const entries = await fs.readdir(current, { withFileTypes: true })
    entries.sort((a, b) => a.name.localeCompare(b.name))
    for (const entry of entries) {
      const relative = prefix ? path.join(prefix, entry.name) : entry.name
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) {
        await walk(full, relative)
        continue
      }
      out.push(relative)
    }
  }

  await walk(root)
  return out
}

function renderGroupedFiles(groups) {
  const lines = []
  for (const group of groups) {
    lines.push(`- ${group.label}:`)
    if (group.files.length === 0) {
      lines.push('  - none')
      continue
    }
    for (const file of group.files) {
      lines.push(`  - ${file}`)
    }
  }
  return lines
}

async function collectSkillSummaries(skillsRoot) {
  const files = await collectFiles(skillsRoot)
  const summaries = []
  for (const file of files.filter((entry) => entry.endsWith('SKILL.md'))) {
    const full = path.join(skillsRoot, file)
    const text = await readTextIfExists(full)
    const lines = text
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter(Boolean)
    const name = file.split(path.sep)[0]
    const description =
      lines.find((entry) => !entry.startsWith('#')) ||
      lines.find((entry) => entry.startsWith('# '))?.replace(/^#\s*/, '') ||
      'No description recorded.'
    summaries.push({ name, description })
  }
  return summaries.sort((a, b) => a.name.localeCompare(b.name))
}

function unique(values) {
  return [...new Set((values || []).filter(Boolean))]
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error)
  process.stderr.write(`${message}\n`)
  process.exitCode = 1
})
