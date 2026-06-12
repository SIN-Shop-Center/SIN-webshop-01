// Purpose: Cron endpoint — import CJ product reviews
// Docs: AGENTS.md
// Schedule: Cron "30 4 * * *" (täglich 4:30 UTC)
// Auth: Authorization: Bearer $CRON_SECRET
// Requires: products.cj_product_id to be set (CJ sync must have run)

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cjRequest } from '@/lib/cj/client'

interface CjReview {
  commentId: string
  productId?: string
  productName?: string
  userName?: string
  userPhoto?: string
  content?: string
  reviewTime?: string
  star?: number
  countryCode?: string
  imageUrls?: string[]
}

export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: products } = await supabase
    .from('products')
    .select('id, cj_product_id')
    .not('cj_product_id', 'is', null)
    .limit(10)

  if (!products || products.length === 0) {
    return NextResponse.json({
      synced: 0,
      total: 0,
      message: 'Keine Produkte mit cj_product_id — CJ-Sync muss zuerst laufen',
    })
  }

  let imported = 0
  let skipped = 0
  const errors: string[] = []

  for (const product of products) {
    try {
      let reviews: CjReview[]
      try {
        reviews = await cjRequest<CjReview[]>('/product/review', {
          query: { productIds: product.cj_product_id! },
        })
      } catch {
        continue
      }

      if (!Array.isArray(reviews) || reviews.length === 0) {
        skipped++
        continue
      }

      for (const review of reviews.slice(0, 50)) {
        const existing = await supabase
          .from('reviews')
          .select('id')
          .eq('cj_comment_id', review.commentId)
          .maybeSingle()

        if (existing.data) continue

        await supabase.from('reviews').insert({
          product_id: product.id,
          user_id: null,
          rating: Math.min(5, Math.max(1, review.star ?? 5)),
          title: null,
          content: review.content ?? null,
          source: 'cj',
          is_verified: true,
          cj_comment_id: review.commentId,
          country_code: review.countryCode ?? null,
          image_urls: review.imageUrls?.length ? review.imageUrls : null,
          created_at: review.reviewTime ?? new Date().toISOString(),
        })
        imported++
      }
    } catch (e) {
      errors.push(`${product.id}: ${e instanceof Error ? e.message : 'unknown'}`)
    }
  }

  if (imported > 0) {
    await supabase.rpc('refresh_product_ratings')
  }

  return NextResponse.json({ synced: imported, skipped, total: products.length, errors })
}
