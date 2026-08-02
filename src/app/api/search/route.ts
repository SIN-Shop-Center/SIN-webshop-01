// Purpose: Bounded product autocomplete API.

import { NextResponse } from 'next/server'

import { checkRateLimit, RateLimitError } from '@/lib/rate-limit'
import { createDataClient } from '@/lib/supabase/data-client'

function escapeLikePattern(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')
}

export async function GET(request: Request) {
  try {
    await checkRateLimit('product-search', { limit: 120, windowSec: 15 * 60 })
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ results: [] }, { status: 429 })
    }
    return NextResponse.json({ results: [] }, { status: 503 })
  }

  const { searchParams } = new URL(request.url)
  const query = (searchParams.get('q') ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 80)
  const requestedLimit = Number(searchParams.get('limit') ?? 5)
  const limit = Number.isInteger(requestedLimit)
    ? Math.max(1, Math.min(requestedLimit, 10))
    : 5

  if (query.length < 2) {
    return NextResponse.json({ results: [] }, { headers: { 'Cache-Control': 'no-store' } })
  }

  const supabase = createDataClient()
  const { data, error } = await supabase
    .from('products_v')
    .select('id, title, price, image_url')
    .ilike('title', `%${escapeLikePattern(query)}%`)
    .limit(limit)

  if (error) {
    console.error('[search] query failed:', error.message)
    return NextResponse.json({ results: [] }, { status: 500 })
  }

  return NextResponse.json(
    { results: data ?? [] },
    { headers: { 'Cache-Control': 'public, max-age=30, s-maxage=60' } },
  )
}
