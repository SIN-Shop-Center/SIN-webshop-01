export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { harvestSupplierCatalog, validateSupplierAutomationToken } from '@/lib/automation/supplier-catalog-browser'

export async function POST(request: NextRequest) {
  const token = request.headers.get('x-simone-internal-token')?.trim() || ''
  if (!validateSupplierAutomationToken(token)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const targetURL = String(body.target_url || '').trim()
  const candidateURLs = Array.isArray(body.candidate_urls) ? body.candidate_urls : []
  if (!targetURL && candidateURLs.length === 0) {
    return NextResponse.json({ error: 'target_url_required' }, { status: 400 })
  }

  try {
    const result = await harvestSupplierCatalog({
      supplier_id: String(body.supplier_id || '').trim(),
      target_url: targetURL,
      candidate_urls: candidateURLs,
      catalog_status: String(body.catalog_status || '').trim(),
      browser_recipe: typeof body.browser_recipe === 'object' && body.browser_recipe !== null ? body.browser_recipe as Record<string, unknown> : {},
      request_payload: typeof body.request_payload === 'object' && body.request_payload !== null ? body.request_payload as Record<string, unknown> : {},
    })
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Supplier catalog browser harvest failed:', error)
    return NextResponse.json(
      { error: 'supplier_catalog_browser_harvest_failed' },
      { status: 502 },
    )
  }
}
