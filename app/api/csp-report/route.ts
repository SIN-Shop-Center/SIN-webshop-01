// Purpose: CSP violation reporting endpoint (Reporting API / report-uri)
// Docs: docs/fixes/issue-40-csp-headers.md
//
// Accepts violation reports from both report-to (JSON) and report-uri
// (application/csp-report) mechanisms and persists them to Supabase.

import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const contentType = req.headers.get('content-type') ?? ''
  let violations: Array<Record<string, unknown>> = []

  try {
    if (contentType.includes('application/csp-report')) {
      const body = await req.json() as Record<string, Record<string, string>>
      const report = body['csp-report'] ?? body
      violations = [report]
    } else if (contentType.includes('application/reports+json') || contentType.includes('application/json')) {
      const body = await req.json() as Array<Record<string, unknown>>
      for (const entry of body) {
        if (entry.type === 'csp-violation' && entry.body && typeof entry.body === 'object') {
          violations.push(entry.body as Record<string, unknown>)
        }
      }
    } else {
      return NextResponse.json({ ok: true, note: 'unsupported content-type' })
    }
  } catch {
    return NextResponse.json({ ok: true, note: 'unparseable body' })
  }

  if (violations.length === 0) {
    return NextResponse.json({ ok: true, note: 'no violations in payload' })
  }

  try {
    const supabase = createAdminClient()
    const rows = violations.map((v) => ({
      document_uri: (v['document-uri'] as string) ?? null,
      violated_directive: (v['violated-directive'] as string) ?? (v.effectiveDirective as string) ?? null,
      blocked_uri: (v['blocked-uri'] as string) ?? null,
      original_policy: (v['original-policy'] as string) ?? null,
      user_agent: req.headers.get('user-agent'),
      received_at: new Date().toISOString(),
    }))
    await supabase.from('csp_violations').insert(rows)
  } catch {
    // never 500 a CSP report — browser would retry indefinitely
  }

  return NextResponse.json({ ok: true })
}
