#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'

const projectRoot = process.cwd()
const registryFile = path.join(projectRoot, 'config', 'sin-a2a', 'registry.json')

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const registry = JSON.parse(await fs.readFile(registryFile, 'utf8'))
  const slug = String(args.slug || '').trim()
  const teamId = String(args.team || '').trim()
  const name = String(args.name || '').trim()

  if (!slug || !teamId || !name) {
    throw new Error('usage: --slug=<slug> --team=<teamId> --name="<Agent Name>" [--short=<SHORT>] [--description="..."] [--force]')
  }

  const team = registry.teams.find((entry) => entry.id === teamId)
  if (!team) {
    throw new Error(`team_not_found:${teamId}`)
  }

  const shortName = String(args.short || slug.toUpperCase()).trim()
  const description = String(args.description || `${name} A2A agent for ${team.name}.`).trim()
  const agentRoot = path.join(projectRoot, team.departmentPath, slug)
  const force = args.force === 'true'

  await mkdir(agentRoot)
  await mkdir(path.join(agentRoot, '.well-known'))
  await mkdir(path.join(agentRoot, 'skills', 'core'))
  await mkdir(path.join(agentRoot, 'deploy', 'huggingface-space'))

  await writeIfAllowed(
    path.join(agentRoot, 'agent.json'),
    JSON.stringify(
      {
        name,
        description,
        version: '0.1.0',
        protocolVersion: '0.3.0',
        url: `https://${slug}-a2a.delqhi.com/a2a/jsonrpc`,
        capabilities: {
          streaming: true,
          pushNotifications: false,
          incrementalArtifacts: true,
        },
        skills: [
          {
            id: 'core',
            name: 'Core Skill',
            description: `Primary skill bundle for ${name}.`,
          },
        ],
      },
      null,
      2,
    ) + '\n',
    force,
  )

  await writeIfAllowed(
    path.join(agentRoot, 'AGENTS.md'),
    `# ${name}\n\n- Team: ${team.name}\n- Slug: ${slug}\n- Short name: ${shortName}\n- This scaffold is generated from config/sin-a2a/registry.json and should be completed with real skills, MCP bindings and public endpoints.\n`,
    force,
  )

  await writeIfAllowed(
    path.join(agentRoot, 'mcp-config.json'),
    JSON.stringify(
      {
        mcpServers: {
          [`${slug}-mcp`]: {
            command: 'pnpm',
            args: ['--dir', projectRoot, `${shortName.toLowerCase()}:mcp`],
          },
        },
      },
      null,
      2,
    ) + '\n',
    force,
  )

  await writeIfAllowed(
    path.join(agentRoot, '.well-known', 'oauth-client.json'),
    JSON.stringify(
      {
        client_id: `https://${slug}-a2a.delqhi.com/.well-known/oauth-client.json`,
        client_name: name,
        redirect_uris: [`https://${slug}-a2a.delqhi.com/oauth/callback`],
        grant_types: ['authorization_code'],
        response_types: ['code'],
        token_endpoint_auth_method: 'none',
      },
      null,
      2,
    ) + '\n',
    force,
  )

  await writeIfAllowed(
    path.join(agentRoot, 'skills', 'core', 'SKILL.md'),
    `# ${name} Core Skill\n\nUse this skill when the request should be delegated to ${name}. Keep prompts sparse, do not inline secrets, and prefer deterministic tools over free-form reasoning.\n`,
    force,
  )

  await writeIfAllowed(
    path.join(agentRoot, 'deploy', 'huggingface-space', 'README.md'),
    `---\ntitle: ${name}\nsdk: docker\napp_port: 7860\n---\n\nThis Hugging Face Space is the public deployment scaffold for ${name}. Wire the A2A endpoint, MCP endpoint and guide surface before publishing.\n`,
    force,
  )

  process.stdout.write(`OK: scaffolded ${name} at ${path.relative(projectRoot, agentRoot)}\n`)
}

function parseArgs(argv) {
  const out = {}
  for (const entry of argv) {
    if (entry === '--force') {
      out.force = 'true'
      continue
    }
    if (!entry.startsWith('--')) {
      continue
    }
    const separator = entry.indexOf('=')
    if (separator < 0) {
      out[entry.slice(2)] = 'true'
      continue
    }
    out[entry.slice(2, separator)] = entry.slice(separator + 1)
  }
  return out
}

async function mkdir(target) {
  await fs.mkdir(target, { recursive: true })
}

async function writeIfAllowed(target, content, force) {
  if (!force) {
    try {
      await fs.access(target)
      return
    } catch {}
  }
  await fs.writeFile(target, content, 'utf8')
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error)
  process.stderr.write(`${message}\n`)
  process.exitCode = 1
})
