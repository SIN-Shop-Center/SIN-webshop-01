import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const cwd = process.cwd()

test('SIN A2A doc sync dry-run renders a deterministic agent block from a supplied registry', async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sin-a2a-doc-sync-'))
  const agentRoot = path.join(tempRoot, 'agent-root')
  const a2aRuntime = path.join(tempRoot, 'a2a-runtime')
  const mcpRuntime = path.join(tempRoot, 'mcp-runtime')
  const coreRoot = path.join(tempRoot, 'core')
  const registryFile = path.join(tempRoot, 'registry.json')
  const scriptPath = path.join(cwd, 'scripts', 'sync-sin-a2a-agent-to-gdoc.mjs')

  await fs.mkdir(path.join(agentRoot, 'deploy'), { recursive: true })
  await fs.mkdir(path.join(agentRoot, 'skills', 'demo-skill'), { recursive: true })
  await fs.mkdir(path.join(a2aRuntime, 'src'), { recursive: true })
  await fs.mkdir(path.join(mcpRuntime, 'src'), { recursive: true })
  await fs.mkdir(path.join(coreRoot, 'src'), { recursive: true })

  await fs.writeFile(path.join(agentRoot, 'agent.json'), JSON.stringify({
    protocolVersion: '0.3.0',
    version: '1.2.3',
    preferredTransport: 'JSONRPC',
    capabilities: {
      streaming: true,
      pushNotifications: false,
      incrementalArtifacts: true,
    },
    defaultInputModes: ['text/plain'],
    defaultOutputModes: ['application/json'],
  }), 'utf8')
  await fs.writeFile(path.join(agentRoot, 'deploy', 'manifest.json'), JSON.stringify({
    agentId: 'test-agent-id',
    team: 'qa-team',
  }), 'utf8')
  await fs.writeFile(path.join(agentRoot, 'mcp-config.json'), JSON.stringify({
    mcpServers: {
      demo: {
        command: 'node',
      },
    },
  }), 'utf8')
  await fs.writeFile(path.join(agentRoot, 'AGENTS.md'), '- Fail closed\n- Citation first\n', 'utf8')
  await fs.writeFile(path.join(agentRoot, 'skills', 'demo-skill', 'SKILL.md'), '# Demo Skill\nDeterministic helper skill.\n', 'utf8')

  await fs.writeFile(path.join(a2aRuntime, 'src', 'server.mjs'), [
    "switch (action) {",
    "  case 'status':",
    "    return { state: 'ready' }",
    "  case 'sync':",
    "    return { state: 'done' }",
    "}",
    'process.env.TEST_A2A_ENV',
  ].join('\n'), 'utf8')
  await fs.writeFile(path.join(mcpRuntime, 'src', 'server.mjs'), [
    "registerTool('list_secrets', {})",
    "registerPrompt('demo_prompt', {})",
    "registerResource('demo_resource', 'resource://demo', {})",
    'process.env.TEST_MCP_ENV',
  ].join('\n'), 'utf8')
  await fs.writeFile(path.join(coreRoot, 'src', 'config.mjs'), 'process.env.TEST_CORE_ENV\n', 'utf8')
  await fs.writeFile(path.join(coreRoot, 'src', 'store.mjs'), "const schema = { kind: z.enum(['github_actions_secret', 'cloudflare_worker_secret']) }\n", 'utf8')
  await fs.writeFile(path.join(coreRoot, 'src', 'providers.mjs'), 'export const providers = []\n', 'utf8')

  await fs.writeFile(registryFile, JSON.stringify({
    workspace: {
      name: 'Test Workforce',
      indexHost: 'agents.example.test',
      indexRoute: '/a2a',
    },
    teams: [
      {
        id: 'qa-team',
        name: 'QA Team',
        departmentPath: 'departments/qa',
      },
    ],
    agents: [
      {
        id: 'test-agent-id',
        slug: 'test-agent',
        shortName: 'TST',
        name: 'Test Agent',
        teamId: 'qa-team',
        status: 'active',
        description: 'Dry-run test agent.',
        repo: {
          name: 'test-agent-repo',
          status: 'active',
        },
        guide: {
          host: 'guide.example.test',
          route: '/agents/test-agent',
        },
        a2a: {
          host: 'a2a.example.test',
          baseUrl: 'http://127.0.0.1:1234',
          jsonRpcPath: '/rpc',
          restPath: '/rest',
          agentCardWellKnownPath: '/.well-known/agent-card.json',
          cardPath: '/.well-known/agent.json',
          oauthClientPath: '/.well-known/oauth-client.json',
          port: 1234,
        },
        mcp: {
          host: 'mcp.example.test',
          baseUrl: 'http://127.0.0.1:5678',
          path: '/mcp',
          transport: ['stdio'],
          port: 5678,
        },
        huggingFaceSpace: {
          owner: 'acme',
          slug: 'test-agent-space',
          hardware: 'cpu-basic',
          status: 'runtime-local',
        },
        cloudflare: {
          directoryHostname: 'agents.example.test',
          a2aHostname: 'a2a.example.test',
          mcpHostname: 'mcp.example.test',
        },
        googleDocs: {
          documentId: 'doc-123',
          referenceTabId: 'tab-ref',
          teamsRootTabId: 'tab-teams',
          teamTabId: 'tab-team',
          agentTabId: 'tab-agent',
        },
        paths: {
          agentRoot: '~/agent-root',
          a2aRuntime: '~/a2a-runtime',
          mcpRuntime: '~/mcp-runtime',
          core: '~/core',
        },
        skills: ['demo-skill'],
        commands: ['pnpm demo:run'],
      },
    ],
  }, null, 2), 'utf8')

  const { stdout } = await execFileAsync('node', [
    scriptPath,
    '--dry-run',
    '--agent=test-agent',
    `--registry-file=${registryFile}`,
  ], {
    cwd,
    env: {
      ...process.env,
      HOME: tempRoot,
    },
    maxBuffer: 10 * 1024 * 1024,
  })

  assert.match(stdout, /SIN_A2A_AGENT_DOC_V2/)
  assert.match(stdout, /- Agent Name: Test Agent/)
  assert.match(stdout, /- Agent Tab: tab-agent/)
  assert.match(stdout, /- status/)
  assert.match(stdout, /- sync/)
  assert.match(stdout, /- list_secrets/)
  assert.match(stdout, /- demo_prompt/)
  assert.match(stdout, /- resource:\/\/demo/)
  assert.match(stdout, /- TEST_A2A_ENV/)
  assert.match(stdout, /- TEST_MCP_ENV/)
  assert.match(stdout, /- TEST_CORE_ENV/)
  assert.match(stdout, /- github_actions_secret/)
  assert.match(stdout, /- cloudflare_worker_secret/)
  assert.match(stdout, /- demo-skill/)
  assert.match(stdout, /Description: Deterministic helper skill\./)
  assert.match(stdout, /14\. Full File Inventory/)
  assert.match(stdout, /~\/agent-root\/AGENTS\.md/)
  assert.match(stdout, /~\/a2a-runtime\/src\/server\.mjs/)
  assert.match(stdout, /~\/mcp-runtime\/src\/server\.mjs/)
  assert.match(stdout, /~\/core\/src\/config\.mjs/)
})
