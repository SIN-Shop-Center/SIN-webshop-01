#!/usr/bin/env node

import { existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const APP_DIR = join(ROOT, 'src', 'app')

const ROUTE_CHECKS = [
  ['/', 'page.tsx'],
  ['/produkte', 'produkte/page.tsx'],
  ['/produkt/[id]', 'produkt/[id]/page.tsx'],
  ['/suche', 'suche/page.tsx'],
  ['/warenkorb', 'warenkorb/page.tsx'],
  ['/kasse', 'kasse/page.tsx'],
  ['/kasse/abgebrochen', 'kasse/abgebrochen/page.tsx'],
  ['/checkout/erfolg', 'checkout/erfolg/page.tsx'],
  ['/auth/login', 'auth/login/page.tsx'],
  ['/konto', 'konto/page.tsx'],
  ['/admin', 'admin/page.tsx'],
  ['/kontakt', 'kontakt/page.tsx'],
  ['/hilfe', 'hilfe/page.tsx'],
  ['/versand', 'versand/page.tsx'],
  ['/impressum', 'impressum/page.tsx'],
  ['/datenschutz', 'datenschutz/page.tsx'],
  ['/agb', 'agb/page.tsx'],
  ['/widerrufsrecht', 'widerrufsrecht/page.tsx'],
  ['/api/health', 'api/health/route.ts'],
  ['/api/healthz', 'api/healthz/route.ts'],
  ['/api/stripe/webhook', 'api/stripe/webhook/route.ts'],
  ['/api/tiktok/oauth/start', 'api/tiktok/oauth/start/route.ts'],
  ['/api/tiktok/oauth/callback', 'api/tiktok/oauth/callback/route.ts'],
  ['/api/tiktok/webhook', 'api/tiktok/webhook/route.ts'],
  ['/api/webhooks/cj', 'api/webhooks/cj/route.ts'],
]

if (!existsSync(APP_DIR)) {
  console.error(`Route gate failed: app directory is missing (${APP_DIR}).`)
  process.exit(1)
}

const missing = ROUTE_CHECKS.filter(([, relativePath]) => !existsSync(join(APP_DIR, relativePath)))

if (missing.length > 0) {
  console.error('Route gate failed. Missing essential ShopSIN route files:')
  for (const [pathname, relativePath] of missing) {
    console.error(`- ${pathname}: src/app/${relativePath}`)
  }
  process.exit(1)
}

const legacyAppDir = join(ROOT, 'apps', 'web', 'src', 'app')
if (existsSync(legacyAppDir)) {
  console.error(`Route gate failed: legacy app tree still exists (${legacyAppDir}).`)
  process.exit(1)
}

console.log(`Route gate passed for ${ROUTE_CHECKS.length} essential ShopSIN pages and endpoints.`)
