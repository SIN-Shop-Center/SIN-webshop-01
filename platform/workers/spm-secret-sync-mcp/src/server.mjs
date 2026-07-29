import { randomUUID } from 'node:crypto'
import express from 'express'
import { z } from 'zod'
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import { createSPMStore } from '@simone/spm-core'

const mcpTransport = String(process.env.SPM_MCP_TRANSPORT || 'stdio').trim().toLowerCase()
const mcpPort = Number(process.env.SPM_MCP_PORT || 8650)
const mcpHost = String(process.env.SPM_MCP_HOST || '127.0.0.1').trim() || '127.0.0.1'
const mcpBaseUrl = String(process.env.SPM_MCP_BASE_URL || `http://${mcpHost === '0.0.0.0' ? '127.0.0.1' : mcpHost}:${mcpPort}`).trim().replace(/\/$/, '')

export function createSecretSyncMcpServer() {
  const store = createSPMStore()
  const server = new McpServer(
    {
      name: 'sin-secret-sync-mcp',
      version: '0.1.0',
    },
    {
      capabilities: {
        logging: {},
      },
      instructions:
        'Deterministic secret fanout tools for GitHub Actions, Cloudflare Workers, and Vercel project environments.',
    },
  )

  server.registerTool(
    'bind_secret_target',
    {
      description: 'Attach or update a sync target binding for a secret stored in SPM.',
      inputSchema: {
        name: z.string().min(2),
        target: z.object({
          id: z.string().min(1),
          kind: z.enum(['github_actions_repo', 'cloudflare_worker_secret', 'vercel_project_env', 'huggingface_space_secret']),
          authSecretName: z.string().min(2),
          params: z.record(z.any()).default({}),
        }),
      },
    },
    async ({ name, target }) => {
      const result = await store.bindTarget({ name, target })
      return textAndJson(`Bound target ${result.id} to ${name}.`, result)
    },
  )

  server.registerTool(
    'sync_bound_secret',
    {
      description: 'Sync one stored secret to its bound provider targets.',
      inputSchema: {
        name: z.string().min(2),
        targetIds: z.array(z.string().min(1)).optional(),
      },
    },
    async ({ name, targetIds }) => {
      const result = await store.syncSecret({ name, targetIds: targetIds || [] })
      return textAndJson(`Synced ${name} to ${result.count} target(s).`, result)
    },
  )

  server.registerTool(
    'sync_all_bound_secrets',
    {
      description: 'Sync every secret that already has at least one bound target.',
    },
    async () => {
      const result = await store.syncAllSecrets()
      return textAndJson(`Synced ${result.length} secret batch(es).`, result)
    },
  )

  server.registerTool(
    'sync_secret_to_github_actions',
    {
      description: 'Bind and sync one secret to a GitHub repository Actions secret in one call.',
      inputSchema: {
        name: z.string().min(2),
        owner: z.string().min(1),
        repo: z.string().min(1),
        authSecretName: z.string().min(2).default('GITHUB_TOKEN'),
        targetId: z.string().min(1).default('github-actions'),
        secretName: z.string().min(1).optional(),
      },
    },
    async ({ name, owner, repo, authSecretName, targetId, secretName }) => {
      await store.bindTarget({
        name,
        target: {
          id: targetId,
          kind: 'github_actions_repo',
          authSecretName,
          params: { owner, repo, secretName },
        },
      })
      const result = await store.syncSecret({ name, targetIds: [targetId] })
      return textAndJson(`Synced ${name} to GitHub ${owner}/${repo}.`, result)
    },
  )

  server.registerTool(
    'sync_secret_to_cloudflare_worker',
    {
      description: 'Bind and sync one secret to a Cloudflare Worker runtime secret.',
      inputSchema: {
        name: z.string().min(2),
        accountId: z.string().min(1),
        scriptName: z.string().min(1),
        authSecretName: z.string().min(2).default('CLOUDFLARE_API_TOKEN'),
        targetId: z.string().min(1).default('cloudflare-worker'),
        secretName: z.string().min(1).optional(),
      },
    },
    async ({ name, accountId, scriptName, authSecretName, targetId, secretName }) => {
      await store.bindTarget({
        name,
        target: {
          id: targetId,
          kind: 'cloudflare_worker_secret',
          authSecretName,
          params: { accountId, scriptName, secretName },
        },
      })
      const result = await store.syncSecret({ name, targetIds: [targetId] })
      return textAndJson(`Synced ${name} to Cloudflare Worker ${scriptName}.`, result)
    },
  )

  server.registerTool(
    'sync_secret_to_vercel_env',
    {
      description: 'Bind and sync one secret to a Vercel project environment variable.',
      inputSchema: {
        name: z.string().min(2),
        projectId: z.string().min(1),
        authSecretName: z.string().min(2).default('VERCEL_TOKEN'),
        targetId: z.string().min(1).default('vercel-env'),
        secretName: z.string().min(1).optional(),
        teamId: z.string().optional(),
        gitBranch: z.string().optional(),
        targets: z.array(z.enum(['production', 'preview', 'development'])).optional(),
      },
    },
    async ({ name, projectId, authSecretName, targetId, secretName, teamId, gitBranch, targets }) => {
      await store.bindTarget({
        name,
        target: {
          id: targetId,
          kind: 'vercel_project_env',
          authSecretName,
          params: { projectId, secretName, teamId, gitBranch, targets },
        },
      })
      const result = await store.syncSecret({ name, targetIds: [targetId] })
      return textAndJson(`Synced ${name} to Vercel project ${projectId}.`, result)
    },
  )

  server.registerTool(
    'sync_secret_to_huggingface_space',
    {
      description: 'Bind and sync one secret to a Hugging Face Space secret.',
      inputSchema: {
        name: z.string().min(2),
        repoId: z.string().min(1),
        authSecretName: z.string().min(2).default('HUGGINGFACE_TOKEN'),
        targetId: z.string().min(1).default('huggingface-space'),
        secretName: z.string().min(1).optional(),
      },
    },
    async ({ name, repoId, authSecretName, targetId, secretName }) => {
      await store.bindTarget({
        name,
        target: {
          id: targetId,
          kind: 'huggingface_space_secret',
          authSecretName,
          params: { repoId, secretName },
        },
      })
      const result = await store.syncSecret({ name, targetIds: [targetId] })
      return textAndJson(`Synced ${name} to Hugging Face Space ${repoId}.`, result)
    },
  )

  server.registerResource(
    'spm-secret-catalog',
    'spm://secrets/catalog',
    {
      description: 'Non-sensitive catalog of SPM secrets and metadata.',
      mimeType: 'application/json',
    },
    async () => {
      const secrets = await store.listSecrets()
      return {
        contents: [
          {
            uri: 'spm://secrets/catalog',
            mimeType: 'application/json',
            text: JSON.stringify(secrets, null, 2),
          },
        ],
      }
    },
  )

  server.registerResource(
    'spm-secret-targets',
    new ResourceTemplate('spm://secret/{name}/targets', { list: undefined }),
    {
      description: 'Target bindings for one secret.',
      mimeType: 'application/json',
    },
    async (_uri, variables) => {
      const name = String(variables.name || '').trim()
      const targets = await store.listTargets({ name })
      return {
        contents: [
          {
            uri: `spm://secret/${name}/targets`,
            mimeType: 'application/json',
            text: JSON.stringify(targets, null, 2),
          },
        ],
      }
    },
  )

  server.registerPrompt(
    'secret-sync-fanout-plan',
    {
      description: 'Prompt template for planning sparse-context secret fanout through SPM.',
      argsSchema: {
        name: z.string().min(2),
      },
    },
    async ({ name }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text:
              `Create a deterministic rollout plan for syncing secret ${name} from SPM to GitHub Actions, Cloudflare Workers, Vercel, and Hugging Face Spaces. ` +
              'Use sparse context, never inline the secret value, validate target metadata first, then fan out provider writes one by one.',
          },
        },
      ],
    }),
  )

  return server
}

export function createSecretSyncMcpHttpApp(options = {}) {
  const app = express()
  app.use(express.json({ limit: '2mb' }))
  attachSecretSyncMcpHttpRoutes(app, options)
  return app
}

export function attachSecretSyncMcpHttpRoutes(app, options = {}) {
  const healthPath = String(options.healthPath || '/health').trim() || '/health'
  const mcpPath = String(options.mcpPath || '/mcp').trim() || '/mcp'

  const transports = {}

  app.get(healthPath, (_req, res) => {
    res.json({
      ok: true,
      server: 'sin-secret-sync-mcp',
      transport: 'streamable_http',
      baseUrl: mcpBaseUrl,
    })
  })

  const mcpHandler = async (req, res) => {
    const sessionId = String(req.headers['mcp-session-id'] || '').trim()

    try {
      let transport = sessionId ? transports[sessionId] : undefined
      if (transport) {
        await transport.handleRequest(req, res, req.body)
        return
      }

      if (!sessionId && req.method === 'POST' && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (createdSessionId) => {
            transports[createdSessionId] = transport
          },
        })
        transport.onclose = () => {
          const activeSessionId = transport.sessionId
          if (activeSessionId && transports[activeSessionId]) {
            delete transports[activeSessionId]
          }
        }

        const server = createSecretSyncMcpServer()
        await server.connect(transport)
        await transport.handleRequest(req, res, req.body)
        return
      }

      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided',
        },
        id: null,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message,
          },
          id: null,
        })
      }
    }
  }

  app.post(mcpPath, mcpHandler)
  app.get(mcpPath, mcpHandler)
  app.delete(mcpPath, mcpHandler)
}

function textAndJson(message, data) {
  return {
    content: [
      {
        type: 'text',
        text: message,
      },
      {
        type: 'text',
        text: JSON.stringify(data, null, 2),
      },
    ],
    structuredContent: data,
  }
}

async function main() {
  if (mcpTransport === 'http') {
    const app = createSecretSyncMcpHttpApp()
    await new Promise((resolve) => {
      app.listen(mcpPort, mcpHost, () => {
        console.log(`sin-secret-sync-mcp listening on ${mcpBaseUrl}/mcp`)
        resolve()
      })
    })
    return
  }

  const server = createSecretSyncMcpServer()
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    const message = error instanceof Error ? error.stack || error.message : String(error)
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  })
}
