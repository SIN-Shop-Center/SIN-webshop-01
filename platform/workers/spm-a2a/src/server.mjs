import express from 'express'
import { randomUUID } from 'node:crypto'
import { AGENT_CARD_PATH } from '@a2a-js/sdk'
import { DefaultRequestHandler, InMemoryTaskStore } from '@a2a-js/sdk/server'
import { agentCardHandler, jsonRpcHandler, restHandler, UserBuilder } from '@a2a-js/sdk/server/express'
import { createSPMStore } from '@simone/spm-core'

const port = Number(process.env.SPM_PORT || 4646)
const baseUrl = String(process.env.SPM_BASE_URL || `http://127.0.0.1:${port}`).trim().replace(/\/$/, '')

export function createAgentCard(publicBaseUrl = baseUrl) {
  return {
    name: 'SIN-Passwordmanager',
    description:
      'A2A secret authority for Simone infrastructure. Stores secrets behind one agent interface and fans them out to GitHub Actions, Cloudflare Workers, and Vercel via deterministic MCP tools.',
    protocolVersion: '0.3.0',
    version: '0.1.0',
    url: `${publicBaseUrl}/a2a/jsonrpc`,
    preferredTransport: 'JSONRPC',
    capabilities: {
      pushNotifications: false,
      streaming: true,
    },
    defaultInputModes: ['text'],
    defaultOutputModes: ['text'],
    skills: [
      {
        id: 'store-secret',
        name: 'Store Secret',
        description: 'Store or update one secret inside SPM.',
        tags: ['secret', 'vault', 'store'],
      },
      {
        id: 'bind-target',
        name: 'Bind Target',
        description: 'Attach GitHub, Cloudflare, or Vercel sync targets to a stored secret.',
        tags: ['secret', 'bind', 'fanout'],
      },
      {
        id: 'sync-secret',
        name: 'Sync Secret',
        description: 'Fan out stored secrets to provider runtimes through the secret-sync MCP toolset.',
        tags: ['secret', 'sync', 'github', 'cloudflare', 'vercel'],
      },
    ],
    additionalInterfaces: [
      { url: `${publicBaseUrl}/a2a/jsonrpc`, transport: 'JSONRPC' },
      { url: `${publicBaseUrl}/a2a/rest`, transport: 'HTTP+JSON' },
    ],
  }
}

export function parseUserCommandText(text) {
  const trimmed = String(text || '').trim()
  if (!trimmed) {
    return { action: 'help' }
  }
  try {
    return JSON.parse(trimmed)
  } catch {
    return { action: 'help', raw: trimmed }
  }
}

class SPMExecutor {
  constructor() {
    this.store = createSPMStore()
    this.cancelledTasks = new Set()
  }

  async cancelTask(taskId) {
    this.cancelledTasks.add(taskId)
  }

  async execute(requestContext, eventBus) {
    const { taskId, contextId, userMessage, task } = requestContext
    const command = parseUserCommandText(extractTextFromMessage(userMessage))

    if (!task) {
      eventBus.publish({
        kind: 'task',
        id: taskId,
        contextId,
        status: {
          state: 'submitted',
          timestamp: new Date().toISOString(),
        },
        history: [userMessage],
      })
    }

    eventBus.publish({
      kind: 'status-update',
      taskId,
      contextId,
      status: {
        state: 'working',
        timestamp: new Date().toISOString(),
      },
      final: false,
    })

    try {
      const result = await this.runCommand(command)
      if (this.cancelledTasks.has(taskId)) {
        this.cancelledTasks.delete(taskId)
        eventBus.publish({
          kind: 'status-update',
          taskId,
          contextId,
          status: {
            state: 'canceled',
            timestamp: new Date().toISOString(),
          },
          final: true,
        })
        eventBus.finished()
        return
      }

      eventBus.publish({
        kind: 'artifact-update',
        taskId,
        contextId,
        artifact: {
          artifactId: randomUUID(),
          name: `spm-result-${taskId}.json`,
          parts: [
            {
              kind: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        },
      })
      eventBus.publish({
        kind: 'status-update',
        taskId,
        contextId,
        status: {
          state: 'completed',
          message: {
            kind: 'message',
            messageId: randomUUID(),
            role: 'agent',
            contextId,
            parts: [
              {
                kind: 'text',
                text: summariseResult(command, result),
              },
            ],
          },
          timestamp: new Date().toISOString(),
        },
        final: true,
      })
      eventBus.finished()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      eventBus.publish({
        kind: 'artifact-update',
        taskId,
        contextId,
        artifact: {
          artifactId: randomUUID(),
          name: `spm-error-${taskId}.txt`,
          parts: [{ kind: 'text', text: message }],
        },
      })
      eventBus.publish({
        kind: 'status-update',
        taskId,
        contextId,
        status: {
          state: 'failed',
          message: {
            kind: 'message',
            messageId: randomUUID(),
            role: 'agent',
            contextId,
            parts: [{ kind: 'text', text: message }],
          },
          timestamp: new Date().toISOString(),
        },
        final: true,
      })
      eventBus.finished()
    }
  }

  async runCommand(command) {
    switch (command.action) {
      case 'put_secret':
        return this.store.putSecret({
          name: command.name,
          value: command.value,
          description: command.description || '',
          tags: Array.isArray(command.tags) ? command.tags : [],
        })
      case 'get_secret':
        return this.store.getSecret({ name: command.name, reveal: Boolean(command.reveal) })
      case 'delete_secret':
        return this.store.deleteSecret({ name: command.name })
      case 'list_secrets':
        return this.store.listSecrets()
      case 'bind_target':
        return this.store.bindTarget({ name: command.name, target: command.target })
      case 'list_targets':
        return this.store.listTargets({ name: command.name || '' })
      case 'sync_secret':
        return this.store.syncSecret({ name: command.name, targetIds: Array.isArray(command.targetIds) ? command.targetIds : [] })
      case 'sync_all_secrets':
        return this.store.syncAllSecrets()
      case 'help':
      default:
        return {
          name: 'SIN-Passwordmanager',
          actions: [
            'put_secret',
            'get_secret',
            'delete_secret',
            'list_secrets',
            'bind_target',
            'list_targets',
            'sync_secret',
            'sync_all_secrets',
          ],
          note: 'Send JSON in the first text part, for example {\"action\":\"list_secrets\"}.',
        }
    }
  }
}

function extractTextFromMessage(message) {
  return (message?.parts || [])
    .filter((part) => part.kind === 'text')
    .map((part) => String(part.text || ''))
    .join('\n')
}

function summariseResult(command, result) {
  switch (command.action) {
    case 'put_secret':
      return `Stored ${command.name}.`
    case 'get_secret':
      return result?.value ? `Loaded ${command.name}.` : `Loaded metadata for ${command.name}.`
    case 'delete_secret':
      return `Deleted ${command.name}.`
    case 'bind_target':
      return `Bound target ${result?.id || ''} to ${command.name}.`
    case 'sync_secret':
      return `Synced ${command.name} to ${result?.count || 0} target(s).`
    case 'sync_all_secrets':
      return `Synced ${Array.isArray(result) ? result.length : 0} secret batch(es).`
    default:
      return 'SPM command completed.'
  }
}

export function createSpmServer() {
  const requestHandler = new DefaultRequestHandler(
    createAgentCard(baseUrl),
    new InMemoryTaskStore(),
    new SPMExecutor(),
  )

  const app = express()
  app.use(express.json({ limit: '2mb' }))
  app.use(`/${AGENT_CARD_PATH}`, agentCardHandler({ agentCardProvider: requestHandler }))
  app.get('/.well-known/agent-card.json', async (_req, res) => {
    res.json(await requestHandler.getAgentCard())
  })
  app.get('/.well-known/agent.json', async (_req, res) => {
    res.json(await requestHandler.getAgentCard())
  })
  app.get('/.well-known/oauth-client.json', (_req, res) => {
    res.json({
      client_id: `${baseUrl}/.well-known/oauth-client.json`,
      client_name: 'SIN-Passwordmanager',
      redirect_uris: [`${baseUrl}/oauth/callback`],
      grant_types: ['authorization_code'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    })
  })
  app.use('/a2a/jsonrpc', jsonRpcHandler({ requestHandler, userBuilder: UserBuilder.noAuthentication }))
  app.use('/a2a/rest', restHandler({ requestHandler, userBuilder: UserBuilder.noAuthentication }))
  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      agent: 'SIN-Passwordmanager',
      baseUrl,
    })
  })

  return app
}

async function main() {
  const app = createSpmServer()
  await new Promise((resolve) => {
    app.listen(port, '127.0.0.1', () => {
      console.log(`SPM A2A listening on ${baseUrl}`)
      resolve()
    })
  })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    const message = error instanceof Error ? error.stack || error.message : String(error)
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  })
}
