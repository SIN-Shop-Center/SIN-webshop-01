// Purpose: Public health endpoint for load balancer / uptime probes (no auth)
// Docs: docs/RUNBOOK-MONITORING.md
//
// Lightweight — zero external API calls. Returns 200 instantly.
// For deep checks, use /api/cron/health-check (CRON_SECRET required).

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
}
