#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

const home = os.homedir()
const projectRoot = process.cwd()
const opencodeDir = path.join(home, '.opencode')
const opencodeJsonFile = path.join(opencodeDir, 'opencode.json')
const opencodeAgentsDir = path.join(opencodeDir, 'agents')
const opencodeCommandsDir = path.join(opencodeDir, 'commands')

const delegationBlock = `

11. SIN-A2A FIRST DELEGATION
- Before delegating work internally, check whether a matching SIN A2A agent exists.
- For secrets, credentials, env propagation and runtime sync, always use SIN-Passwordmanager (SPM) first.
- If a matching SIN A2A agent exists, prefer it over internal junior/helper agent delegation.`

async function main() {
  const opencodeJson = parseJsonWithTrailingCommaSupport(await fs.readFile(opencodeJsonFile, 'utf8'))
  opencodeJson.mcp = opencodeJson.mcp || {}
  opencodeJson.mcp['sin-passwordmanager'] = {
    type: 'local',
    command: ['pnpm', '--dir', projectRoot, 'spm:mcp'],
    enabled: true,
  }
  await fs.writeFile(opencodeJsonFile, `${JSON.stringify(opencodeJson, null, 2)}\n`, 'utf8')

  await fs.mkdir(opencodeCommandsDir, { recursive: true })
  await fs.writeFile(
    path.join(opencodeCommandsDir, 'sin-a2a-first.md'),
    '# SIN A2A First\n\nIf a matching SIN A2A agent exists, route the task there first. For secret work, always use SIN-Passwordmanager (SPM) via MCP/A2A instead of ad-hoc secret handling.\n',
    'utf8',
  )

  const agentFiles = await fs.readdir(opencodeAgentsDir)
  for (const file of agentFiles.filter((entry) => entry.endsWith('.json'))) {
    const fullPath = path.join(opencodeAgentsDir, file)
    const payload = parseJsonWithTrailingCommaSupport(await fs.readFile(fullPath, 'utf8'))
    if (typeof payload.systemPrompt !== 'string' || payload.systemPrompt.includes('SIN-A2A FIRST DELEGATION')) {
      continue
    }
    payload.systemPrompt = `${payload.systemPrompt}${delegationBlock}`
    await fs.writeFile(fullPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  }

  process.stdout.write('OK: installed SIN-A2A-first OpenCode integration\n')
}

function parseJsonWithTrailingCommaSupport(input) {
  return JSON.parse(String(input).replace(/,\s*([}\]])/g, '$1'))
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error)
  process.stderr.write(`${message}\n`)
  process.exitCode = 1
})
