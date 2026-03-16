import { existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const APP_DIR = join(ROOT, 'apps', 'web', 'src', 'app')

const ROUTE_CHECKS = [
  { pathname: '/', kind: 'page' },
  { pathname: '/products', kind: 'page' },
  { pathname: '/products?segment=b2b', kind: 'page' },
  { pathname: '/products?segment=b2c', kind: 'page' },
  { pathname: '/kontakt', kind: 'page' },
  { pathname: '/cart', kind: 'page' },
  { pathname: '/checkout', kind: 'page' },
  { pathname: '/checkout/success', kind: 'page' },
  { pathname: '/login', kind: 'page' },
  { pathname: '/kundencenter', kind: 'page' },
  { pathname: '/kundencenter/login', kind: 'page' },
  { pathname: '/admin/login', kind: 'page' },
  { pathname: '/forbidden', kind: 'page' },
  { pathname: '/faq', kind: 'page' },
  { pathname: '/versand', kind: 'page' },
  { pathname: '/rueckgabe', kind: 'page' },
  { pathname: '/impressum', kind: 'page' },
  { pathname: '/datenschutz', kind: 'page' },
  { pathname: '/agb', kind: 'page' },
  { pathname: '/widerrufsrecht', kind: 'page' },
  { pathname: '/account', kind: 'page' },
  { pathname: '/a2a', kind: 'page' },
  { pathname: '/api/health', kind: 'endpoint' },
]

function routeExists(route) {
  const pathname = route.pathname.split('?')[0]
  if (pathname === '/') {
    return existsSync(join(APP_DIR, 'page.tsx'))
  }
  const targetDir = join(APP_DIR, pathname.slice(1))
  if (route.kind === 'endpoint') {
    return existsSync(join(targetDir, 'route.ts'))
  }
  return existsSync(join(targetDir, 'page.tsx'))
}

const missing = ROUTE_CHECKS.filter((route) => !routeExists(route))

if (missing.length > 0) {
  console.error('Broken route gate failed. Missing essential route files:')
  for (const route of missing) {
    console.error(`- ${route.pathname} (${route.kind})`)
  }
  process.exit(1)
}

console.log(`Route gate passed for ${ROUTE_CHECKS.length} essential pages/endpoints.`)
