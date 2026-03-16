#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { resolveWebProductionEnv } from './lib/web-production-env.mjs'

function fail(message) {
  console.error(message)
  process.exit(1)
}

const [command, ...args] = process.argv.slice(2)

if (!command) {
  fail('Usage: node scripts/with-web-production-env.mjs <command> [...args]')
}

let siteUrl = ''
let publicAppUrl = ''
try {
  const resolved = resolveWebProductionEnv(process.env)
  siteUrl = resolved.siteUrl
  publicAppUrl = resolved.publicAppUrl
} catch (error) {
  fail(`Invalid production web env: ${error instanceof Error ? error.message : String(error)}`)
}

const npmExecPath = String(process.env.npm_execpath || '').trim()
const useCurrentNodeForPnpm = command === 'pnpm' && /pnpm/i.test(npmExecPath)
const spawnCommand = useCurrentNodeForPnpm ? process.execPath : command
const spawnArgs = useCurrentNodeForPnpm ? [npmExecPath, ...args] : args

const result = spawnSync(spawnCommand, spawnArgs, {
  stdio: 'inherit',
  env: {
    ...process.env,
    SITE_URL: siteUrl,
    NEXT_PUBLIC_APP_URL: publicAppUrl,
  },
})

if (result.error) {
  fail(result.error.message)
}

process.exit(result.status ?? 1)
