// Purpose: Brücke Stufe 3 → 4 — published TikTok-Produkte als Tagging-Queue
// für den Hermes Browser-Agenten (SIN-Hermes-TikTok-Affiliate-Bundle) exportieren.
// Docs: docs/SIN_TIKTOK_MASTER_PIPELINE.md
//
// Aufruf: node scripts/pipeline/export-tagging-queue.mjs
// Output: ./tagging-queue.json — Input für den Hermes-Agenten.

import { writeFileSync } from 'node:fs'

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const MAX_TAGS_PER_DAY = 3

async function main() {
  const { data: products, error } = await supabase
    .from('products')
    .select('id, title, tiktok_product_id, tiktok_published_at, image_url')
    .eq('tiktok_status', 'published')
    .not('tiktok_product_id', 'is', null)
    .order('tiktok_published_at', { ascending: false })
    .limit(MAX_TAGS_PER_DAY)

  if (error) throw error

  const queue = (products ?? []).map((p) => ({
    sin_product_id: p.id,
    tiktok_product_id: p.tiktok_product_id,
    title: p.title,
    image_url: p.image_url,
    published_at: p.tiktok_published_at,
    action: 'create_video_and_tag',
    max_posts_today: MAX_TAGS_PER_DAY,
    note: 'Produkt im TikTok-Video-Composer über die Shop-Produktsuche taggen (Suche nach tiktok_product_id oder title).',
  }))

  writeFileSync('./tagging-queue.json', JSON.stringify(queue, null, 2))
  console.log(`${queue.length} Produkte → ./tagging-queue.json (max ${MAX_TAGS_PER_DAY}/Tag)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
