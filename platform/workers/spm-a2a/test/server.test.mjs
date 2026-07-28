import test from 'node:test'
import assert from 'node:assert/strict'
import { createAgentCard, parseUserCommandText } from '../src/server.mjs'

test('agent card contains SPM identity', () => {
  const card = createAgentCard('http://127.0.0.1:4646')
  assert.equal(card.name, 'SIN-Passwordmanager')
  assert.equal(card.protocolVersion, '0.3.0')
})

test('command parser accepts JSON actions', () => {
  const parsed = parseUserCommandText('{"action":"list_secrets"}')
  assert.equal(parsed.action, 'list_secrets')
})
