// Purpose: Sync CJ product images → Supabase Storage (WebP-optimized, FIX #47)
// Usage: import { syncCjImages } from '@/scripts/sync-cj-images'
// Docs: Issue #47 — Image-Optimization
//
// Workflow:
//   1. Fetch product image from CJ CDN
//   2. Convert to WebP (1920px max, quality 82) via sharp
//   3. Upload to Supabase Storage bucket 'product-images' (public)
//   4. Save public URL to product.image_url_local
//
// The new image_url_local column is preferred by frontend (falls back to image_url)

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'shop' } },
)

const BUCKET = 'product-images'

export interface ImageSyncResult {
  total: number
  synced: number
  failed: number
  errors: string[]
}

export async function syncCjImages(limit = 50): Promise<ImageSyncResult> {
  // 1. Hole Produkte ohne lokales Bild
  const { data: products, error } = await supabase
    .from('products')
    .select('id, image_url')
    .is('image_url_local', null)
    .not('image_url', 'is', null)
    .limit(limit)

  if (error) throw error

  // 2. Hole sharp dynamisch (pepnpm add sharp)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sharp: any
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sharp = (await import('sharp' as any)).default
  } catch {
    console.warn('[image-sync] sharp not installed — skipping')
    return { total: products?.length ?? 0, synced: 0, failed: 0, errors: ['sharp not installed'] }
  }

  const result: ImageSyncResult = { total: products?.length ?? 0, synced: 0, failed: 0, errors: [] }

  for (const p of products ?? []) {
    try {
      const res = await fetch(p.image_url)
      if (!res.ok) {
        result.failed++
        result.errors.push(`${p.id}: fetch ${res.status}`)
        continue
      }

      const buf = Buffer.from(await res.arrayBuffer())

      // Convert to WebP
      const webp = await sharp(buf)
        .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer()

      const path = `${p.id}.webp`

      // Upload to Supabase Storage
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, webp, { contentType: 'image/webp', upsert: true })

      if (upErr) throw upErr

      // Get public URL
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)

      // Update product
      await supabase
        .from('products')
        .update({ image_url_local: pub.publicUrl })
        .eq('id', p.id)

      result.synced++
    } catch (e) {
      result.failed++
      result.errors.push(`${p.id}: ${(e as Error).message}`)
    }
  }

  return result
}
