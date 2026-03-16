export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { assertSafeTikTokURL } from '@/lib/automation/tiktok-shop-browser'
import { openExternalURL } from '@/lib/automation/system-browser'
import { readGoogleDocument } from '@/lib/google/google-docs'
import { requireAdminSession } from '@/lib/server/admin-route'

const GERMAN_TIKTOK_REGISTRATION_HOSTS = new Set(['seller-de.tiktok.com', 'seller-de-accounts.tiktok.com'])

const DEFAULT_REGISTRATION_URLS = [
  'https://seller-de.tiktok.com/account/register',
  'https://seller-de-accounts.tiktok.com/account/register',
  'https://seller-de-accounts.tiktok.com/',
  'https://seller-de.tiktok.com/account/welcome',
]

const FALLBACK_REQUIRED_STEPS = [
  'Seller-Center Konto mit E-Mail oder Telefonnummer anlegen.',
  'Verifizierungs-E-Mail oder SMS bestätigen.',
  'Unternehmensland und Shop-Grunddaten im Seller Center ausfüllen.',
  'Danach in /admin/channels den Browser-Connect abschließen und Metadaten laden.',
]

export async function POST(request: NextRequest) {
  try {
    await requireAdminSession()
  } catch (error) {
    const code = error instanceof Error ? error.message : 'admin_session_missing'
    return NextResponse.json({ error: code }, { status: code === 'admin_session_forbidden' ? 403 : 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const requestedURLs = normalizeRequestedURLs([
    body.target_url,
    body.candidate_urls,
  ])
  const candidateURLs = await normalizeRegistrationURLs([...requestedURLs, ...DEFAULT_REGISTRATION_URLS])
  const registrationURL = candidateURLs[0] || ''
  if (!registrationURL) {
    return NextResponse.json({ error: 'tiktok_registration_url_missing' }, { status: 400 })
  }

  let guideTitle = ''
  let guideExcerpt = ''
  let guideChecklist: string[] = []
  let guideStatus: 'empty' | 'ready' | 'blocked' | 'error' = 'empty'
  let guideError = ''
  const guideInput = String(body.google_doc_url || body.google_doc_id || '').trim()

  if (guideInput) {
    try {
      const document = await readGoogleDocument(guideInput)
      guideTitle = document.title
      guideExcerpt = compactExcerpt(document.text)
      guideChecklist = document.checklist
      guideStatus = 'ready'
    } catch (error) {
      guideStatus = isCredentialError(error) ? 'blocked' : 'error'
      guideError = error instanceof Error ? error.message : String(error)
    }
  }

  try {
    const launch = await openExternalURL(registrationURL)
    return NextResponse.json(
      {
        status: guideStatus === 'error' ? 'partial' : 'started',
        launch_mode: 'system_browser',
        launcher: launch.launcher,
        registration_url: registrationURL,
        inspected_urls: candidateURLs,
        ignored_urls: requestedURLs.filter((url) => !candidateURLs.includes(url)),
        guide_status: guideStatus,
        guide_error: guideError,
        guide_title: guideTitle,
        guide_excerpt: guideExcerpt,
        required_steps: guideChecklist.length > 0 ? guideChecklist : FALLBACK_REQUIRED_STEPS,
        official_help_urls: [
          'https://seller-de-accounts.tiktok.com/account/register',
          'https://seller-de-accounts.tiktok.com/',
          'https://seller-de.tiktok.com/',
        ],
      },
      { status: 200 },
    )
  } catch (error) {
    return NextResponse.json(
      {
        error: 'tiktok_registration_browser_launch_failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    )
  }
}

async function normalizeRegistrationURLs(values: unknown[]): Promise<string[]> {
  const out: string[] = []
  const candidates = values.flatMap((value) => (Array.isArray(value) ? value : [value]))
  for (const candidate of candidates) {
    const current = String(candidate || '').trim()
    if (!current || out.includes(current)) {
      continue
    }
    try {
      const safeURL = await assertSafeTikTokURL(current)
      if (!GERMAN_TIKTOK_REGISTRATION_HOSTS.has(safeURL.hostname)) {
        continue
      }
      out.push(safeURL.toString())
    } catch {}
  }
  return out
}

function normalizeRequestedURLs(values: unknown[]): string[] {
  const out: string[] = []
  for (const candidate of values.flatMap((value) => (Array.isArray(value) ? value : [value]))) {
    const current = String(candidate || '').trim()
    if (current && !out.includes(current)) {
      out.push(current)
    }
  }
  return out
}

function compactExcerpt(text: string) {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length <= 420) {
    return normalized
  }
  return `${normalized.slice(0, 417).trim()}...`
}

function isCredentialError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return (
    message.includes('google_service_account_missing') ||
    message.includes('google_service_account_file_invalid') ||
    message.includes('google_service_account_b64_invalid')
  )
}
