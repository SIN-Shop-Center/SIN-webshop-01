// Purpose: Search API for autocomplete suggestions
// Docs: AGENTS.md

import { NextResponse } from 'next/server'
import { createDataClient } from '@/lib/supabase/data-client'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() ?? ''
  const limit = Math.min(Number(searchParams.get('limit')) || 5, 10)

  if (q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const supabase = createDataClient()
  const { data, error } = await supabase
    .from('products_v')
    .select('id, title, price, image_url')
    .ilike('title', `%${q}%`)
    .limit(limit)

  if (error) {
    console.error('[search] Fehler:', error.message)
    return NextResponse.json({ results: [] }, { status: 500 })
  }

  return NextResponse.json({ results: data ?? [] })
}
