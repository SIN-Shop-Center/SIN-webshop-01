# Fix #12 — Video analysieren und Webshop entsprechend der neuen Kenntnisse optimieren

> **Status:** OPEN · **Priority:** low · **Repo:** `SIN-Shop-Center/SIN-webshop-01`
> **Issue:** https://github.com/SIN-Shop-Center/SIN-webshop-01/issues/12

## Context

There is no video upload/analysis pipeline in this repo. The issue refers to a generic "watch video → optimize" workflow that doesn't have a concrete deliverable. The real intent is probably one of:

- (a) Watch a competitor / YouTube tutorial and apply insights
- (b) Implement a video-CTA banner on PDP
- (c) Build a video-hosting + -playback page

The most useful reading: **a 30-second product video increases add-to-cart by 9–30% in dropshipping** (Shopify 2024 study), so a small video component on PDPs is a high-ROI, low-effort change.

## Recommended fix (concrete)

### Step 1 — ask the human for the video

```text
# Comment on the issue:
"This is a low-context issue. Two questions before we start:

1) Where is the video file (URL / S3 path)?
2) Is the video for:
   (a) the hero of the homepage,
   (b) a product detail page (one per product),
   (c) a brand/intro on the landing page?

If you don't have a video yet, the highest-leverage alternative is to
close this issue as 'deferred — no video assets' and reopen it once
a video exists."
```

### Step 2 — if (b) PDP video (most likely intent)

Add a `video_url` column to `shop.products`, store the URL (HLS .m3u8 preferred, MP4 fallback), and render `<video controls>` above the product gallery.

```sql
-- scripts/supabase/setup-pdp-video.sql
ALTER TABLE shop.products
  ADD COLUMN IF NOT EXISTS video_url TEXT;
```

```tsx
// app/components/product/product-video.tsx
interface Props {
  src: string | null
  poster?: string
}
export function ProductVideo({ src, poster }: Props) {
  if (!src) return null
  return (
    <video
      controls
      poster={poster}
      preload="none"
      playsInline
      className="aspect-video w-full rounded-lg bg-muted"
    >
      <source src={src} type="video/mp4" />
    </video>
  )
}
```

Render in `app/produkt/[id]/page.tsx` above the gallery:

```tsx
<ProductVideo src={product.video_url} poster={product.image_url} />
```

### Step 3 — lazy-load for performance

Add to `app/lib/queries.ts` (or wherever the product query lives):

```ts
// returns product with video_url
.select('id, title, price, image_url, image_url_local, video_url, ...')
```

## Acceptance

- `product.video_url` renders on PDP when set.
- Lighthouse mobile performance score does not drop below 0.85 (video is `preload="none"`).
- The "join our newsletter" → "watch product video" funnel can be measured via Plausible (Issue #58).

## Closing

Close #12 with a one-line summary of the actual work done. If the answer was "no video assets", close with `Closed: deferred — no video assets, reopen when video available`.
