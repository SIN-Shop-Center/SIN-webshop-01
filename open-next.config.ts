// Purpose: OpenNext Cloudflare adapter config
// Docs: https://opennext.js.org/cloudflare/get-started
//       https://opennext.js.org/cloudflare/caching
//
// Hinweis: Wir nutzen den KV-basierten Incremental Cache anstelle von R2,
// weil der Cloudflare-Account aktuell R2 nicht aktiviert hat.
// R2 kann spaeter ueber das Dashboard aktiviert und optional migriert werden
// (siehe docs/DEPLOY-CLOUDFLARE.md, Sektion "R2-Migration").

import { defineCloudflareConfig } from "@opennextjs/cloudflare"
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache"
import kvTagCache from "@opennextjs/cloudflare/overrides/tag-cache/kv-next-tag-cache"

export default defineCloudflareConfig({
  // ISR-Cache via Workers KV (Binding: NEXT_INC_CACHE_KV)
  incrementalCache: kvIncrementalCache,

  // Tag-Cache via Workers KV (Binding: NEXT_TAG_CACHE_KV)
  // Wird fuer Next.js 16 SWR (stale-while-revalidate) gebraucht.
  tagCache: kvTagCache,

  // Default-Cache fuer ISR (kann pro Route ueberschrieben werden via revalidate)
  // 60 Sekunden - passt zu unseren revalidate-Werten in app/page.tsx
  // Lokales Dev: `pnpm preview` laedt den Worker in Miniflare.
})
