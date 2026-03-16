import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const FALLBACK_FLAGS = [
  'NEXT_PUBLIC_WEB_CATALOG_FALLBACK_ENABLED',
  'NEXT_PUBLIC_WEB_ACCOUNT_FALLBACK_ENABLED',
]
const BUILD_DIR = join(process.cwd(), 'apps', 'web', '.next')
const FORBIDDEN_BUILD_SNIPPETS = [
  'https://runtime-check.invalid',
  'https://shop.example.com',
]

const invalid = FALLBACK_FLAGS.filter((name) => String(process.env[name] || '').toLowerCase() === 'true')

if (invalid.length > 0) {
  console.error('Production fallback validation failed. The following flags must not be true during build/deploy:')
  for (const name of invalid) {
    console.error(`- ${name}=true`)
  }
  process.exit(1)
}

if (existsSync(BUILD_DIR)) {
  const scanArgs = ['-n', '--no-messages', '--glob', '!**/*.map']
  for (const snippet of FORBIDDEN_BUILD_SNIPPETS) {
    scanArgs.push('-e', snippet)
  }
  scanArgs.push(BUILD_DIR)
  const scan = spawnSync('rg', scanArgs, { encoding: 'utf8' })
  if (scan.status === 0) {
    console.error('Production fallback validation failed. Built output contains forbidden placeholder urls:')
    console.error(scan.stdout.trimEnd())
    process.exit(1)
  }
  if ((scan.status ?? 1) > 1) {
    console.error('Production fallback validation could not scan built output.')
    if (scan.stderr) {
      console.error(scan.stderr.trimEnd())
    }
    process.exit(1)
  }
}

console.log('Fallback env validation passed.')
