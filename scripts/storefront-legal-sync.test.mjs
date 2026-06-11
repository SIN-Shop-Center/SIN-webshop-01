import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import {
  STOREFRONT_FOOTER_LEGAL_NOTE,
  STOREFRONT_LEGAL_LINKS,
  STOREFRONT_LEGAL_PAGES,
} from '../config/storefront-legal.mjs'

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

// TODO(#20-26): Re-enable after Next.js migration completes.
// References Next.js file paths (apps/web/src/app/...) that do not exist
// in the current Vite SPA. These checks are valid for the Next.js target
// architecture described in docs/PLAN-VERKAUFSFAEHIG.md.
test.skip('apps/web and workers/cloudflare consume the shared legal/footer source', async () => {
  const [footer, footerLegalLinks, impressumPage, datenschutzPage, agbPage, widerrufsrechtPage, worker] = await Promise.all([
    read('apps/web/src/components/layout/Footer.tsx'),
    read('apps/web/src/components/layout/FooterLegalLinks.tsx'),
    read('apps/web/src/app/impressum/page.tsx'),
    read('apps/web/src/app/datenschutz/page.tsx'),
    read('apps/web/src/app/agb/page.tsx'),
    read('apps/web/src/app/widerrufsrecht/page.tsx'),
    read('workers/cloudflare/worker.mjs'),
  ])

  assert.match(footer, /STOREFRONT_LEGAL_LINKS/)
  assert.match(footer, /STOREFRONT_FOOTER_LEGAL_NOTE/)
  assert.match(footerLegalLinks, /STOREFRONT_LEGAL_LINKS/)

  assert.match(impressumPage, /STOREFRONT_LEGAL_PAGES/)
  assert.match(datenschutzPage, /STOREFRONT_LEGAL_PAGES/)
  assert.match(agbPage, /STOREFRONT_LEGAL_PAGES/)
  assert.match(widerrufsrechtPage, /STOREFRONT_LEGAL_PAGES/)

  assert.match(worker, /STOREFRONT_LEGAL_LINKS/)
  assert.match(worker, /STOREFRONT_LEGAL_PAGES/)
  assert.match(worker, /STOREFRONT_FOOTER_LEGAL_NOTE/)
})
