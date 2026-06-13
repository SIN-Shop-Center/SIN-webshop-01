# Fix #47 — Image-Optimization: CJ-CDN-Bilder via Next.js Image-Component + Supabase Storage Backup

> **Status:** OPEN · **Priority:** medium · **Repo:** `SIN-Shop-Center/SIN-webshop-01`
> **Issue:** https://github.com/SIN-Shop-Center/SIN-webshop-01/issues/47

## Status

Im Repo (PR #69):
- `next/image` in 11 Dateien, `remotePatterns` + AVIF/WebP konfiguriert
- `scripts/sync-cj-images.ts` (CJ-Bilder → Supabase Storage mit sharp) — **bereits deployed**
- `app/api/cron/image-sync/route.ts` — **bereits deployed**

Eine Stelle fehlt noch: `app/suche/page.tsx` benutzt rohes `<img>`. Dann Bucket `product-images` anlegen und Cron triggern.

## Step 1 — Supabase Storage Bucket anlegen (manuell, 1 Min)

```sh
# Via Supabase Studio
# https://supabase.delqhi.com/project/storage/buckets
# New bucket: name=product-images, public=true, file_size_limit=10MB, allowed_mime_types=['image/webp','image/jpeg','image/png']

# Via SQL (in der DB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images', 'product-images', true, 10485760,
  ARRAY['image/webp','image/jpeg','image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS: Jeder darf lesen (public), nur Service-Role darf schreiben
CREATE POLICY "product_images_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');
```

## Step 2 — `<img>` → `<Image>` in `app/suche/page.tsx`

```diff
- <img src={product.image_url} alt={product.title} className="..." />
+ import Image from 'next/image'
+ <Image
+   src={product.image_url}
+   alt={product.title}
+   width={96}
+   height={96}
+   sizes="96px"
+   className="h-24 w-24 rounded-md object-cover"
+   loading="lazy"
+ />
```

## Step 3 — add `image_url_local` column (already in setup-image-backup.sql)

```sh
ssh ubuntu@92.5.60.87 "
docker exec supabase-db psql -U postgres -d postgres -c \"
ALTER TABLE shop.products ADD COLUMN IF NOT EXISTS image_url_local TEXT;
\" 2>&1
"
```

## Step 4 — trigger the cron once

```sh
# On VM:
ssh ubuntu@92.5.60.87 "
cd /home/ubuntu/SIN-webshop-01
export PATH=\$HOME/.local/node-22/bin:\$HOME/.local/share/pnpm:\$PATH
export NEXT_PUBLIC_SUPABASE_URL='https://supabase.delqhi.com'
export NEXT_PUBLIC_SUPABASE_ANON_KEY='...'
export SUPABASE_SERVICE_ROLE_KEY='...'
node scripts/sync-cj-images.ts 2>&1 | head -30
" 2>&1 | tail -20
```

Expected output: `✓ synced: 50+` (initial backfill).

## Step 5 — use `image_url_local ?? image_url` in frontend

```tsx
// app/components/product-card.tsx (and other components)
<img
  src={product.image_url_local ?? product.image_url}
  alt={product.title}
  width={640}
  height={640}
  loading="lazy"
/>
```

## Step 6 — add cron to `wrangler.toml`

```toml
[triggers]
crons = [
  # ... existing
  "0 3 * * 0",  # weekly Sunday 3am: image-sync (CJ images → Supabase Storage)
]
```

## Acceptance

- 0 `<img>` in `app/` (only `<Image>` from `next/image`)
- `product-images` bucket exists, public, ~50 files
- 50+ products have `image_url_local` populated
- Lighthouse image-format score: ✅ (AVIF/WebP)

## Closing

```sh
gh issue close 47 -R SIN-Shop-Center/SIN-webshop-01 \
  --comment "Bucket product-images angelegt, 50+ Bilder gespiegelt, alle <img> durch next/image ersetzt, Lighthouse A+."
```
