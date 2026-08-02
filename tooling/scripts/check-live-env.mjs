#!/usr/bin/env node

import {
  FEATURE_TIKTOK_SHOP_KEYS,
  PLACEHOLDER_SNIPPETS,
  REQUIRED_RUNTIME_KEYS,
} from './live-env-schema.mjs'

const withSmoke = process.argv.includes('--with-smoke')
const failures = []
const warnings = []

function valueOf(name) {
  return String(process.env[name] || '').trim()
}

function fail(message) {
  failures.push(message)
}

function requireValue(name) {
  const value = valueOf(name)
  if (!value) fail(`${name} is required`)
  return value
}

function validateNoPlaceholder(name, value) {
  if (!value) return
  const hit = PLACEHOLDER_SNIPPETS.find((snippet) => value.toLowerCase().includes(snippet.toLowerCase()))
  if (hit) fail(`${name} looks like a placeholder value (${hit})`)
}

function parseURL(name, value, { https = true, noPort = false } = {}) {
  if (!value) return null
  let parsed
  try {
    parsed = new URL(value)
  } catch {
    fail(`${name} must be a valid absolute URL`)
    return null
  }
  if (https && parsed.protocol !== 'https:') fail(`${name} must use https://`)
  if (['localhost', '127.0.0.1', '::1'].includes(parsed.hostname.toLowerCase())) {
    fail(`${name} must not point to localhost for go-live`)
  }
  if (noPort && parsed.port) fail(`${name} must not contain a public port`)
  return parsed
}

function normalizeURL(parsed) {
  if (!parsed) return ''
  return `${parsed.origin}${parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/$/, '')}`
}

function validateEmail(name, value) {
  if (!value) return
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) fail(`${name} must be a valid email address`)
}

function validateFromAddress(value) {
  if (!value) return
  const match = value.match(/<([^>]+)>/)?.[1] ?? value
  validateEmail('RESEND_FROM_EMAIL', match.trim())
}

function validateBoolean(name, value) {
  if (!['true', 'false'].includes(value)) fail(`${name} must be explicitly true or false`)
}

const values = Object.fromEntries(REQUIRED_RUNTIME_KEYS.map((key) => [key, requireValue(key)]))
for (const [key, value] of Object.entries(values)) validateNoPlaceholder(key, value)

const siteURL = parseURL('SITE_URL', values.SITE_URL)
const appURL = parseURL('NEXT_PUBLIC_APP_URL', values.NEXT_PUBLIC_APP_URL)
if (siteURL && appURL && normalizeURL(siteURL) !== normalizeURL(appURL)) {
  fail('SITE_URL and NEXT_PUBLIC_APP_URL must match')
}

parseURL('NEXT_PUBLIC_SUPABASE_URL', values.NEXT_PUBLIC_SUPABASE_URL, { noPort: true })
try {
  const databaseURL = new URL(values.DATABASE_URL)
  if (!['postgres:', 'postgresql:'].includes(databaseURL.protocol)) {
    fail('DATABASE_URL must use postgres:// or postgresql://')
  }
  if (!databaseURL.hostname || !databaseURL.pathname || databaseURL.pathname === '/') {
    fail('DATABASE_URL must include a host and database name')
  }
} catch {
  fail('DATABASE_URL must be a valid PostgreSQL connection URL')
}
validateEmail('CJ_EMAIL', values.CJ_EMAIL)
validateFromAddress(values.RESEND_FROM_EMAIL)
if (values.CSP_ENFORCE !== 'true') fail('CSP_ENFORCE must be true for go-live')

if (values.STRIPE_SECRET_KEY && !values.STRIPE_SECRET_KEY.startsWith('sk_live_')) {
  fail('STRIPE_SECRET_KEY must be a Stripe live key for go-live')
}
if (values.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && !values.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.startsWith('pk_live_')) {
  fail('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must be a Stripe live publishable key for go-live')
}
if (values.STRIPE_WEBHOOK_SECRET && !values.STRIPE_WEBHOOK_SECRET.startsWith('whsec_')) {
  fail('STRIPE_WEBHOOK_SECRET must be a Stripe webhook signing secret')
}
if (values.RESEND_WEBHOOK_SECRET && !values.RESEND_WEBHOOK_SECRET.startsWith('whsec_')) {
  fail('RESEND_WEBHOOK_SECRET must be a Resend webhook signing secret')
}

for (const name of [
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RESEND_API_KEY',
  'RESEND_WEBHOOK_SECRET',
  'CJ_API_KEY',
  'CJ_WEBHOOK_SECRET',
  'CRON_SECRET',
]) {
  if (values[name] && values[name].length < 20) warnings.push(`${name} looks unusually short`)
}

const saveMode = valueOf('TIKTOK_SAVE_MODE') || 'AS_DRAFT'
if (!['AS_DRAFT', 'LISTING'].includes(saveMode)) {
  fail('TIKTOK_SAVE_MODE must be AS_DRAFT or LISTING')
}

const contentUploadEnabled = valueOf('TIKTOK_CONTENT_UPLOAD_ENABLED') || 'false'
validateBoolean('TIKTOK_CONTENT_UPLOAD_ENABLED', contentUploadEnabled)
if (contentUploadEnabled === 'true' && !valueOf('TIKTOK_CONTENT_USER_ACCESS_TOKEN')) {
  fail('TIKTOK_CONTENT_USER_ACCESS_TOKEN is required when content upload is enabled')
}

const tiktokValues = Object.fromEntries(FEATURE_TIKTOK_SHOP_KEYS.map((key) => [key, valueOf(key)]))
const anyTikTokConfigured = Object.values(tiktokValues).some(Boolean)
if (anyTikTokConfigured || saveMode === 'LISTING') {
  for (const [key, value] of Object.entries(tiktokValues)) {
    if (!value) fail(`${key} is required when TikTok Shop is configured`)
    validateNoPlaceholder(key, value)
  }
}
if (saveMode === 'LISTING') {
  warnings.push('TIKTOK_SAVE_MODE=LISTING enables direct listing; verify development-shop approval and category attributes')
}

if (withSmoke) {
  const smokeBase = valueOf('SMOKE_BASE_URL') || values.NEXT_PUBLIC_APP_URL
  const parsedSmoke = parseURL('SMOKE_BASE_URL', smokeBase)
  if (parsedSmoke && appURL && normalizeURL(parsedSmoke) !== normalizeURL(appURL)) {
    fail('SMOKE_BASE_URL must match NEXT_PUBLIC_APP_URL for the production gate')
  }
}

if (warnings.length) {
  console.warn('Live environment warnings:')
  for (const warning of warnings) console.warn(`- ${warning}`)
}

if (failures.length) {
  console.error(`Live environment check failed (${failures.length} issue${failures.length === 1 ? '' : 's'}):`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`Live environment check passed (${withSmoke ? 'runtime+smoke' : 'runtime'}).`)
