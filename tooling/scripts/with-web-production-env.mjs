#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { readLocalSupabaseStatus } from './lib/local-supabase-env.mjs'
import { resolveWebProductionEnv } from './lib/web-production-env.mjs'

function fail(message) {
  console.error(message)
  process.exit(1)
}

const [command, ...args] = process.argv.slice(2)

if (!command) {
  fail('Usage: node tooling/scripts/with-web-production-env.mjs <command> [...args]')
}

const commandEnv = { ...process.env }
const useLocalSupabase = ['1', 'true'].includes(
  String(commandEnv.WEB_PRODUCTION_ENV_USE_LOCAL_SUPABASE || '').toLowerCase(),
)
if (useLocalSupabase) {
  try {
    const local = readLocalSupabaseStatus({ env: commandEnv })
    commandEnv.NEXT_PUBLIC_SUPABASE_URL ||= local.apiUrl
    commandEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= local.anonKey
    commandEnv.SUPABASE_SERVICE_ROLE_KEY ||= local.serviceRoleKey
    commandEnv.DATABASE_URL ||= local.databaseUrl
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error))
  }
}

let siteUrl = ''
let publicAppUrl = ''
try {
  const resolved = resolveWebProductionEnv(commandEnv)
  siteUrl = resolved.siteUrl
  publicAppUrl = resolved.publicAppUrl
} catch (error) {
  fail(`Invalid production web env: ${error instanceof Error ? error.message : String(error)}`)
}

const npmExecPath = String(commandEnv.npm_execpath || '').trim()
const useCurrentNodeForPnpm = command === 'pnpm' && /pnpm/i.test(npmExecPath)
const spawnCommand = useCurrentNodeForPnpm ? process.execPath : command
const spawnArgs = useCurrentNodeForPnpm ? [npmExecPath, ...args] : args

const result = spawnSync(spawnCommand, spawnArgs, {
  stdio: 'inherit',
  env: {
    ...commandEnv,
    SITE_URL: siteUrl,
    NEXT_PUBLIC_APP_URL: publicAppUrl,
  },
})

if (result.error) {
  fail(result.error.message)
}

process.exit(result.status ?? 1)
