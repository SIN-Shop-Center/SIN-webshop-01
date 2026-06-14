// Purpose: OpenNext Cloudflare adapter config — R2 ISR cache + DO queue + D1 tag cache
// Docs: https://opennext.js.org/cloudflare/caching
//       docs/DEPLOY-CLOUDFLARE.md
//
// Setup: R2 incremental cache, Durable Objects queue, D1 tag cache.
// R2 muss im Cloudflare-Dashboard aktiviert sein; Bucket + D1 DB werden via
// Wrangler angelegt (siehe docs/DEPLOY-CLOUDFLARE.md).

import { defineCloudflareConfig } from "@opennextjs/cloudflare"
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache"
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue"
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache"

export default defineCloudflareConfig({
  // ISR-Cache via R2 (Binding: NEXT_INC_CACHE_R2_BUCKET)
  incrementalCache: r2IncrementalCache,

  // Zeitbasierte Revalidierung (z. B. revalidate = 300) via Durable Objects Queue
  queue: doQueue,

  // On-Demand Revalidierung (revalidatePath / revalidateTag) via D1
  tagCache: d1NextTagCache,
})
