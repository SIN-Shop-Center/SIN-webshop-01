import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import {
  hasFlag,
  loadEnvFile,
  loadLocalEnvFiles,
  localEnvCandidates,
  readArgValue,
} from './cli-env.mjs'

test('readArgValue supports split and inline flags', () => {
  assert.equal(readArgValue('--alpha', ['--alpha', 'one']), 'one')
  assert.equal(readArgValue('--beta', ['--beta=two']), 'two')
  assert.equal(readArgValue('--missing', ['--alpha', 'one']), '')
})

test('hasFlag detects exact flag matches only', () => {
  assert.equal(hasFlag('--dry-run', ['--dry-run', '--other']), true)
  assert.equal(hasFlag('--dry-run', ['--dry-run=true']), false)
})

test('loadEnvFile respects override semantics', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cli-env-load-'))
  const envFile = path.join(dir, '.env')
  const preservedKey = 'CLI_ENV_TEST_KEEP'
  const overrideKey = 'CLI_ENV_TEST_OVERRIDE'

  await fs.writeFile(
    envFile,
    [
      `${preservedKey}=from-file`,
      `export ${overrideKey}=\"from-file-override\"`,
    ].join('\n'),
    'utf8',
  )

  const originalPreserved = process.env[preservedKey]
  const originalOverride = process.env[overrideKey]

  try {
    process.env[preservedKey] = 'existing'
    process.env[overrideKey] = 'existing-override'

    loadEnvFile(envFile, false)
    assert.equal(process.env[preservedKey], 'existing')
    assert.equal(process.env[overrideKey], 'existing-override')

    loadEnvFile(envFile, true)
    assert.equal(process.env[preservedKey], 'from-file')
    assert.equal(process.env[overrideKey], 'from-file-override')
  } finally {
    restoreEnv(preservedKey, originalPreserved)
    restoreEnv(overrideKey, originalOverride)
  }
})

test('loadLocalEnvFiles loads canonical env candidates without duplicates', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cli-env-candidates-'))
  const webDir = path.join(dir, 'apps', 'web')
  await fs.mkdir(webDir, { recursive: true })

  const rootKey = 'CLI_ENV_TEST_ROOT'
  const webKey = 'CLI_ENV_TEST_WEB'
  const originalRoot = process.env[rootKey]
  const originalWeb = process.env[webKey]

  await fs.writeFile(path.join(dir, '.env'), `${rootKey}=root-value\n`, 'utf8')
  await fs.writeFile(path.join(webDir, '.env.local'), `${webKey}=web-value\n`, 'utf8')

  try {
    delete process.env[rootKey]
    delete process.env[webKey]

    loadLocalEnvFiles({ cwd: dir })

    assert.equal(process.env[rootKey], 'root-value')
    assert.equal(process.env[webKey], 'web-value')

    const candidates = localEnvCandidates(dir)
    assert.equal(candidates.length, new Set(candidates).size)
    assert.ok(candidates.some((entry) => entry.endsWith(path.join('.env'))))
    assert.ok(candidates.some((entry) => entry.endsWith(path.join('apps', 'web', '.env.local'))))
  } finally {
    restoreEnv(rootKey, originalRoot)
    restoreEnv(webKey, originalWeb)
  }
})

function restoreEnv(key, value) {
  if (value === undefined) {
    delete process.env[key]
    return
  }
  process.env[key] = value
}
