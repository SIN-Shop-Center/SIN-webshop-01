import { randomUUID } from 'node:crypto'
import { ClientFactory } from '@a2a-js/sdk/client'

const baseUrl = String(process.env.SPM_BASE_URL || 'http://127.0.0.1:4646').trim().replace(/\/$/, '')

export async function sendSpmCommand(command) {
  const factory = new ClientFactory()
  const client = await factory.createFromUrl(baseUrl)
  return client.sendMessage({
    message: {
      kind: 'message',
      messageId: randomUUID(),
      role: 'user',
      parts: [{ kind: 'text', text: JSON.stringify(command) }],
    },
  })
}

async function main() {
  const [action = 'help', ...rest] = process.argv.slice(2)
  const command = buildCommand(action, rest)
  const result = await sendSpmCommand(command)
  console.log(JSON.stringify(result, null, 2))
}

function buildCommand(action, args) {
  switch (action) {
    case 'list':
      return { action: 'list_secrets' }
    case 'get':
      return { action: 'get_secret', name: args[0], reveal: args.includes('--reveal') }
    case 'put':
      return { action: 'put_secret', name: args[0], value: args[1], description: args.slice(2).join(' ') }
    case 'delete':
      return { action: 'delete_secret', name: args[0] }
    case 'sync':
      return { action: 'sync_secret', name: args[0] }
    case 'sync-all':
      return { action: 'sync_all_secrets' }
    case 'send':
      return JSON.parse(args.join(' '))
    default:
      return { action: 'help' }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    const message = error instanceof Error ? error.stack || error.message : String(error)
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  })
}
