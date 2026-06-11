// Purpose: Cron — warnt BEVOR der TikTok refresh_token abläuft
// Docs: docs/SIN_TIKTOK_MASTER_PIPELINE.md
//
// Schedule: "0 6 * * *" (täglich, via GitHub Action)
// Auth: Authorization: Bearer $CRON_SECRET

import { NextResponse } from 'next/server'

import { sendPipelineAlert } from '@/lib/tiktok/alerts'
import { createAdminClient } from '@/lib/supabase/admin'

const WARN_DAYS = 14

export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data: auth } = await supabase
    .from('tiktok_auth')
    .select('refresh_token_expires_at, access_token_expires_at')
    .eq('id', 1)
    .maybeSingle()

  if (!auth) {
    await sendPipelineAlert({
      subject: 'TikTok NICHT autorisiert',
      errors: ['Keine Tokens in tiktok_auth — Seller muss die App (neu) autorisieren.'],
    })
    return NextResponse.json({ status: 'not_authorized' })
  }

  const daysLeft = Math.floor(
    (new Date(auth.refresh_token_expires_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
  )

  if (daysLeft <= WARN_DAYS) {
    await sendPipelineAlert({
      subject: `TikTok refresh_token läuft in ${daysLeft} Tagen ab`,
      errors: [
        `refresh_token gültig bis ${new Date(auth.refresh_token_expires_at).toLocaleString('de-DE')}.`,
        'Seller muss die App im Partner Center NEU autorisieren, sonst stoppt die gesamte Pipeline.',
        'Autorisierungs-Link: Partner Center → My Apps → Authorization Link → mit Seller-Account öffnen.',
      ],
    })
  }

  return NextResponse.json({ status: 'ok', refreshTokenDaysLeft: daysLeft })
}
