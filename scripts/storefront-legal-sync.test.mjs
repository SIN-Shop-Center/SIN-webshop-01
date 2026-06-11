import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import {
  STOREFRONT_FOOTER_LEGAL_NOTE,
  STOREFRONT_LEGAL_LINKS,
  STOREFRONT_LEGAL_PAGES,
} from '../config/storefront-legal.ts'

const ROOT = process.cwd()

async function read(relativePath) {
  return readFile(path.join(ROOT, relativePath), 'utf8')
}

test('shared storefront legal config covers every legal footer route', () => {
  assert.equal(typeof STOREFRONT_FOOTER_LEGAL_NOTE, 'string')
  assert.ok(STOREFRONT_FOOTER_LEGAL_NOTE.length > 0)

  assert.deepEqual(
    STOREFRONT_LEGAL_LINKS.map((link) => link.href),
    [
      STOREFRONT_LEGAL_PAGES.impressum.path,
      STOREFRONT_LEGAL_PAGES.datenschutz.path,
      STOREFRONT_LEGAL_PAGES.agb.path,
      STOREFRONT_LEGAL_PAGES.widerrufsrecht.path,
      '/versand',
    ],
  )
})

test('Next.js app pages and components consume the shared legal/footer source', async () => {
  const [impressumPage, datenschutzPage, agbPage, widerrufsrechtPage, legalComponent, footerComponent] = await Promise.all([
    read('app/impressum/page.tsx'),
    read('app/datenschutz/page.tsx'),
    read('app/agb/page.tsx'),
    read('app/widerrufsrecht/page.tsx'),
    read('app/components/LegalPage.tsx'),
    read('app/components/Footer.tsx'),
  ])

  // Each legal page imports STOREFRONT_LEGAL_PAGES from the shared config
  assert.match(impressumPage, /STOREFRONT_LEGAL_PAGES/)
  assert.match(datenschutzPage, /STOREFRONT_LEGAL_PAGES/)
  assert.match(agbPage, /STOREFRONT_LEGAL_PAGES/)
  assert.match(widerrufsrechtPage, /STOREFRONT_LEGAL_PAGES/)

  // LegalPage component uses the shared footer links and note
  assert.match(legalComponent, /STOREFRONT_LEGAL_LINKS/)
  assert.match(legalComponent, /STOREFRONT_FOOTER_LEGAL_NOTE/)

  // Footer uses the shared legal links and footer note
  assert.match(footerComponent, /STOREFRONT_LEGAL_LINKS/)
  assert.match(footerComponent, /STOREFRONT_FOOTER_LEGAL_NOTE/)
})
