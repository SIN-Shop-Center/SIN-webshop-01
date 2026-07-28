import { createServer } from 'node:http'
import { pathToFileURL } from 'node:url'

import { agentCard, buildPlan, oauthClient } from './contracts.mjs'

const MAX_BODY_BYTES = 64 * 1024

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  response.end(JSON.stringify(payload))
}

async function readJson(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw new Error('Request body too large')
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}

function requestBaseUrl(request) {
  const configured = process.env.A2A_PUBLIC_BASE_URL?.trim()
  return configured || `http://${request.headers.host || '127.0.0.1:4647'}`
}

async function handleRequest(request, response) {
  const url = new URL(request.url || '/', requestBaseUrl(request))
  if (request.method === 'GET' && url.pathname === '/health') {
    return sendJson(response, 200, { status: 'ok', agentId: 'sin-shop-logistic', dryRunDefault: true })
  }
  if (request.method === 'GET' && ['/.well-known/agent-card.json', '/.well-known/agent.json'].includes(url.pathname)) {
    return sendJson(response, 200, agentCard(requestBaseUrl(request)))
  }
  if (request.method === 'GET' && url.pathname === '/.well-known/oauth-client.json') {
    return sendJson(response, 200, oauthClient(requestBaseUrl(request)))
  }

  try {
    if (request.method === 'POST' && url.pathname === '/a2a/rest') {
      return sendJson(response, 200, buildPlan(await readJson(request)))
    }
    if (request.method === 'POST' && url.pathname === '/a2a/jsonrpc') {
      const body = await readJson(request)
      if (body.jsonrpc !== '2.0' || body.method !== 'message/send') {
        return sendJson(response, 400, { jsonrpc: '2.0', id: body.id ?? null, error: { code: -32601, message: 'Method not found' } })
      }
      return sendJson(response, 200, { jsonrpc: '2.0', id: body.id ?? null, result: buildPlan(body.params) })
    }
    if (request.method === 'POST' && url.pathname === '/mcp') {
      const body = await readJson(request)
      if (body.method === 'tools/list') {
        return sendJson(response, 200, {
          jsonrpc: '2.0',
          id: body.id ?? null,
          result: { tools: [{ name: 'logistics_plan', description: 'Build a reversible logistics dry-run plan', inputSchema: { type: 'object', required: ['flow'] } }] },
        })
      }
      if (body.method === 'tools/call' && body.params?.name === 'logistics_plan') {
        return sendJson(response, 200, { jsonrpc: '2.0', id: body.id ?? null, result: { structuredContent: buildPlan(body.params.arguments) } })
      }
      return sendJson(response, 400, { jsonrpc: '2.0', id: body.id ?? null, error: { code: -32601, message: 'Method not found' } })
    }
  } catch (error) {
    return sendJson(response, 400, { error: error instanceof Error ? error.message : 'Invalid request' })
  }

  return sendJson(response, 404, { error: 'Not found' })
}

export function createLogisticServer() {
  return createServer((request, response) => {
    handleRequest(request, response).catch(() => sendJson(response, 500, { error: 'Internal error' }))
  })
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a2aPort = Number(process.env.A2A_PORT || 4647)
  const mcpPort = Number(process.env.MCP_PORT || 8651)
  const a2a = createLogisticServer().listen(a2aPort, '127.0.0.1')
  const mcp = createLogisticServer().listen(mcpPort, '127.0.0.1')
  console.log(`sin-shop-logistic A2A listening on 127.0.0.1:${a2aPort}`)
  console.log(`sin-shop-logistic MCP listening on 127.0.0.1:${mcpPort}`)
  const shutdown = () => {
    a2a.close()
    mcp.close()
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}
