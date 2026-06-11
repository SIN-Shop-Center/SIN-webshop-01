// Purpose: OpenNext Cloudflare adapter config
// Docs: https://opennext.js.org/cloudflare/get-started

import { defineCloudflareConfig } from '@opennextjs/cloudflare'

export default defineCloudflareConfig({
  // Incremental Static Regeneration (ISR) und dynamische Routes
  //
  // Default-Cache für ISR (kann pro Route überschrieben werden via revalidate)
  // 60 Sekunden — passt zu unseren revalidate-Werten in app/page.tsx
  // Lokales Dev: `pnpm preview` lädt den Worker in Miniflare.
})
