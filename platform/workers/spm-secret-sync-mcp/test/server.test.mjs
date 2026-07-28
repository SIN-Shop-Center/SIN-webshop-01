import test from 'node:test'
import assert from 'node:assert/strict'
import { createSecretSyncMcpHttpApp, createSecretSyncMcpServer } from '../src/server.mjs'

test('server factory creates MCP server instance', async () => {
  const server = createSecretSyncMcpServer()
  assert.equal(typeof server.connect, 'function')
  await server.close().catch(() => {})
})

test('http app factory creates express-compatible app', async () => {
  const app = createSecretSyncMcpHttpApp()
  assert.equal(typeof app.use, 'function')
  assert.equal(typeof app.listen, 'function')
})
