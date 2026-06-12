#!/usr/bin/env node
/**
 * Setzt alle Secrets aus .env.local als GitHub Repository Secrets.
 * Verwendet die GitHub CLI (gh) — muss eingeloggt sein.
 *
 * Usage: node scripts/deploy-github-secrets.mjs
 * Voraussetzung: `gh auth status` zeigt eingeloggten User
 */
import { readFileSync } from 'fs'
import { execSync } from 'child_process'

const ENV_FILE = '.env.local'
const REPO = 'SIN-webshop-01' // wird automatisch aus git remote ermittelt

function loadEnv(file) {
  const content = readFileSync(file, 'utf-8')
  const env = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }
  return env
}

function getRepo() {
  try {
    const remote = execSync('git remote get-url origin', { encoding: 'utf-8' }).trim()
    // GitHub URL format: https://github.com/owner/repo.git oder git@github.com:owner/repo.git
    const match = remote.match(/github\.com[/:]([^/]+)\/([^/.]+)/)
    if (match) return `${match[1]}/${match[2]}`
  } catch {
    // ignore
  }
  return null
}

function setSecret(key, value, repo) {
  try {
    execSync(`gh secret set ${key} --body ${JSON.stringify(value)} -R ${repo}`, { stdio: 'pipe' })
    console.log(`✅ ${key} gesetzt`)
  } catch (e) {
    console.error(`❌ ${key} fehlgeschlagen: ${e.message}`)
  }
}

const env = loadEnv(ENV_FILE)
const repo = getRepo()

if (!repo) {
  console.error('❌ Kein GitHub remote gefunden. Bitte REPO in Script setzen.')
  process.exit(1)
}

console.log(`🚀 Setze ${Object.keys(env).length} Secrets in GitHub ${repo}...\n`)

for (const [key, value] of Object.entries(env)) {
  if (!value) {
    console.log(`⚠️  ${key} ist leer — übersprungen`)
    continue
  }
  setSecret(key, value, repo)
}

console.log('\n✅ Alle GitHub Secrets gesetzt!')
