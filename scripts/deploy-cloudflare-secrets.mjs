#!/usr/bin/env node
/**
 * Deployt alle Secrets aus .env.local zu Cloudflare Workers.
 * Liest die .env.local Datei und setzt jeden Wert als Wrangler Secret.
 *
 * Usage: node scripts/deploy-cloudflare-secrets.mjs
 * Voraussetzung: wrangler CLI eingeloggt (`wrangler whoami` zeigt Account)
 */
import { readFileSync } from 'fs'
import { execSync } from 'child_process'

const ENV_FILE = '.env.local'

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
    // Entferne Anführungszeichen
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }
  return env
}

function setSecret(key, value) {
  try {
    // Verwende echo und pipe für Secrets mit Sonderzeichen
    const cmd = `echo ${JSON.stringify(value)} | wrangler secret put ${key}`
    execSync(cmd, { stdio: 'inherit', cwd: process.cwd() })
    console.log(`✅ ${key} gesetzt`)
  } catch (e) {
    console.error(`❌ ${key} fehlgeschlagen: ${e.message}`)
    process.exit(1)
  }
}

const env = loadEnv(ENV_FILE)

console.log(`🚀 Deploye ${Object.keys(env).length} Secrets zu Cloudflare...\n`)

for (const [key, value] of Object.entries(env)) {
  if (!value) {
    console.log(`⚠️  ${key} ist leer — übersprungen`)
    continue
  }
  setSecret(key, value)
}

console.log('\n✅ Alle Cloudflare Secrets deployed!')
console.log('Nächster Schritt: wrangler deploy')
