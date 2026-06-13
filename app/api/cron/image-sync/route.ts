// Purpose: Cron — sync CJ product images to Supabase Storage (FIX #47)
// Auth: Authorization: Bearer $CRON_SECRET
// Schedule: NOT a Worker route — run via VM cron: scripts/ops/sync-cj-images-vm.mjs
//
// We do NOT ship sharp in the Worker bundle (native .node modules can't be bundled).
// The VM cron runs the same logic with full Node.js APIs available.

import { NextResponse } from 'next/server'

export const maxDuration = 60

export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    info: 'Image sync must be triggered from the VM. Run: bash scripts/ops/sync-cj-images-cron.sh',
    detectedAt: new Date().toISOString(),
  })
}
