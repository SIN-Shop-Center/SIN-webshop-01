// Purpose: Cron — sync CJ product images to Supabase Storage (FIX #47)
// Auth: Authorization: Bearer $CRON_SECRET
// Schedule: weekly

import { NextResponse } from 'next/server'
import { syncCjImages } from '@/scripts/sync-cj-images'

export const maxDuration = 300 // 5 min

export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const result = await syncCjImages(50)
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
