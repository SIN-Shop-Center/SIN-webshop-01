#!/usr/bin/env node
import { execSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const API_DIR = 'apps/api'
const ADMIN_PACKAGE = 'simone-webshop/apps/api/internal/admin'
const includeAdmin = process.env.INCLUDE_ADMIN_TESTS === '1'
const goTestTimeout = String(process.env.GO_TEST_TIMEOUT || '8m').trim() || '8m'
const maxWallTimeMs = Number.parseInt(String(process.env.GO_TEST_MAX_WALL_MS || '900000'), 10)
const dockerFallback = String(process.env.GO_TEST_DOCKER_FALLBACK || '1') !== '0'
const rootDir = process.cwd()
const apiAbsDir = path.join(rootDir, API_DIR)
const goTmpDir = process.env.GOTMPDIR || path.join(apiAbsDir, '.go-tmp-exec')
const goCacheDir = process.env.GOCACHE || path.join(rootDir, 'tmp', 'go-cache')
const goModCacheDir = process.env.GOMODCACHE || path.join(rootDir, 'tmp', 'go-mod-cache')

function listPackagesWithTests() {
  const listedWithTests = execSync(
    "go list -f '{{.ImportPath}} {{if or (gt (len .TestGoFiles) 0) (gt (len .XTestGoFiles) 0)}}test{{end}}' ./...",
    {
      cwd: API_DIR,
      encoding: 'utf8',
      env: {
        ...process.env,
        GOTMPDIR: goTmpDir,
        GOCACHE: goCacheDir,
        GOMODCACHE: goModCacheDir,
      },
    },
  )
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\s+/))
    .filter((parts) => parts[1] === 'test')
    .map((parts) => parts[0])

  return includeAdmin
    ? listedWithTests
    : listedWithTests.filter((pkg) => pkg !== ADMIN_PACKAGE)
}

function runGo(args, cwd = API_DIR, extraEnv = {}, timeoutMs = maxWallTimeMs) {
  return spawnSync('go', args, {
    cwd,
    stdio: 'inherit',
    timeout: Number.isFinite(timeoutMs) ? timeoutMs : 900000,
    env: {
      ...process.env,
      GOTMPDIR: goTmpDir,
      GOCACHE: goCacheDir,
      GOMODCACHE: goModCacheDir,
      ...extraEnv,
    },
  })
}

function shouldFallbackToDocker(result) {
  if (!dockerFallback) {
    return false
  }
  if (result.error && result.error.code === 'ETIMEDOUT') {
    return true
  }
  return result.status !== 0
}

function resolveDockerContainer() {
  if (process.env.GO_TEST_DOCKER_CONTAINER) {
    return process.env.GO_TEST_DOCKER_CONTAINER
  }

  const names = execSync("docker ps --format '{{.Names}}'", { encoding: 'utf8' })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  if (names.includes('mikasmissions-control-plane')) {
    return 'mikasmissions-control-plane'
  }
  return ''
}

function runDockerFallback(targets) {
  const container = resolveDockerContainer()
  if (!container) {
    return { status: 1, error: null, skipped: true }
  }

  const remoteDir = '/tmp/simone-api-tests'
  const escapedApiDir = apiAbsDir.replace(/'/g, "'\\''")
  const escapedTargets = targets.map((pkg) => `'${pkg.replace(/'/g, "'\\''")}'`).join(' ')
  const goBinary = '/usr/local/go/bin/go'

  execSync(
    `COPYFILE_DISABLE=1 COPY_EXTENDED_ATTRIBUTES_DISABLE=1 tar --format=ustar -C '${escapedApiDir}' -cf - . | docker exec -i ${container} sh -lc 'rm -rf ${remoteDir} && mkdir -p ${remoteDir} && tar -C ${remoteDir} -xf -'`,
    { stdio: 'inherit', shell: '/bin/zsh' },
  )
  const dockerCmd =
    `mkdir -p /root/go-tmp && chmod 1777 /root/go-tmp && cd ${remoteDir} && ` +
    `GOTMPDIR=/root/go-tmp ${goBinary} test -tags=nomsgpack -timeout=${goTestTimeout} ${escapedTargets}`
  const result = spawnSync('docker', ['exec', container, 'sh', '-lc', dockerCmd], {
    stdio: 'inherit',
    timeout: Number.isFinite(maxWallTimeMs) ? maxWallTimeMs : 900000,
  })
  return { ...result, skipped: false }
}

if (!fs.existsSync(goTmpDir)) {
  fs.mkdirSync(goTmpDir, { recursive: true })
}
if (!fs.existsSync(goCacheDir)) {
  fs.mkdirSync(goCacheDir, { recursive: true })
}
if (!fs.existsSync(goModCacheDir)) {
  fs.mkdirSync(goModCacheDir, { recursive: true })
}

const targets = listPackagesWithTests()
if (targets.length === 0) {
  console.error('No Go test packages found for API tests.')
  process.exit(1)
}

const probeTimeoutMs = Number.parseInt(String(process.env.GO_TEST_PROBE_WALL_MS || '45000'), 10)
const probe = runGo(['test', '-run', '^$', '-count=1', '-tags=nomsgpack', targets[0]], API_DIR, {}, probeTimeoutMs)
if (probe.error && probe.error.code === 'ETIMEDOUT') {
  console.error(`go test probe exceeded wall timeout (${probeTimeoutMs}ms).`)
}

let result = probe
if (probe.status === 0) {
  result = runGo(['test', `-timeout=${goTestTimeout}`, '-tags=nomsgpack', ...targets])
}

if (shouldFallbackToDocker(result)) {
  console.log('Native go test failed; trying Docker fallback runner.')
  const dockerResult = runDockerFallback(targets)
  if (dockerResult.skipped) {
    console.error('Docker fallback unavailable. Set GO_TEST_DOCKER_CONTAINER or run native tests on an exec-capable host.')
    process.exit(result.status ?? 1)
  }
  if (dockerResult.error && dockerResult.error.code === 'ETIMEDOUT') {
    console.error(`Docker go test exceeded wall timeout (${maxWallTimeMs}ms).`)
    process.exit(1)
  }
  if (dockerResult.status !== 0) {
    process.exit(dockerResult.status ?? 1)
  }
  console.log(`API tests passed for ${targets.length} packages via Docker fallback.`)
  process.exit(0)
}

if (result.error && result.error.code === 'ETIMEDOUT') {
  console.error(`go test exceeded wall timeout (${maxWallTimeMs}ms).`)
  process.exit(1)
}
if (result.status !== 0) {
  process.exit(result.status ?? 1)
}

console.log(
  includeAdmin
    ? `API tests passed for ${targets.length} test packages (including ${ADMIN_PACKAGE}).`
    : `API tests passed for ${targets.length} test packages (excluded ${ADMIN_PACKAGE}).`,
)
if (!includeAdmin) {
  console.log('Set INCLUDE_ADMIN_TESTS=1 to include full admin package tests.')
}
