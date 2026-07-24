// Purpose: Bounded CSP violation ingestion. Reports never contain full request bodies.

import { NextResponse } from 'next/server'

import { checkRateLimit, RateLimitError } from '@/lib/rate-limit'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_BODY_BYTES = 64 * 1024
const MAX_REPORTS = 10

function text(value: unknown, maxLength: number): string | null {
  return typeof value === 'string' && value.trim()
    ? value.trim().slice(0, maxLength)
    : null
}

export async function POST(req: Request) {
  try {
    await checkRateLimit('csp-report', { limit: 100, windowSec: 3600 })
  } catch (error) {
    if (error instanceof RateLimitError) return new NextResponse(null, { status: 204 })
    return new NextResponse(null, { status: 204 })
  }

  const contentLength = Number(req.headers.get('content-length') || 0)
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return new NextResponse(null, { status: 204 })
  }

  const raw = await req.text()
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
    return new NextResponse(null, { status: 204 })
  }

  const contentType = req.headers.get('content-type') ?? ''
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return new NextResponse(null, { status: 204 })
  }

  const violations: Array<Record<string, unknown>> = []
  if (contentType.includes('application/csp-report') && parsed && typeof parsed === 'object') {
    const object = parsed as Record<string, unknown>
    const report = object['csp-report'] ?? object
    if (report && typeof report === 'object' && !Array.isArray(report)) {
      violations.push(report as Record<string, unknown>)
    }
  } else if (
    (contentType.includes('application/reports+json') || contentType.includes('application/json')) &&
    Array.isArray(parsed)
  ) {
    for (const entry of parsed.slice(0, MAX_REPORTS)) {
      if (
        entry &&
        typeof entry === 'object' &&
        (entry as Record<string, unknown>).type === 'csp-violation'
      ) {
        const body = (entry as Record<string, unknown>).body
        if (body && typeof body === 'object' && !Array.isArray(body)) {
          violations.push(body as Record<string, unknown>)
        }
      }
    }
  }

  if (violations.length === 0) return new NextResponse(null, { status: 204 })

  const rows = violations.slice(0, MAX_REPORTS).map((violation) => ({
    document_uri: text(violation['document-uri'] ?? violation.documentURL, 1000),
    violated_directive: text(
      violation['violated-directive'] ?? violation.effectiveDirective,
      200,
    ),
    blocked_uri: text(violation['blocked-uri'] ?? violation.blockedURL, 1000),
    original_policy: text(violation['original-policy'] ?? violation.originalPolicy, 4000),
    user_agent: text(req.headers.get('user-agent'), 500),
    received_at: new Date().toISOString(),
  }))

  const admin = createAdminClient()
  const { error } = await admin.from('csp_violations').insert(rows)
  if (error) console.error('[csp-report] insert failed:', error.message)

  // Browsers may retry report delivery on errors; always acknowledge bounded input.
  return new NextResponse(null, { status: 204 })
}
