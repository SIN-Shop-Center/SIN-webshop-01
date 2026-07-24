// Purpose: CJ API client with DB-cached access token (Step 7 of migration)
// Docs: PLAN-VERKAUFSFAEHIG.md (Step 7 — CJ Dropshipping integration)
//
// SECURITY: server-only. Bypasses no RLS by itself, but the DB queries it
// triggers use the admin client which does.
//
// Rate limit: getAccessToken is limited to 1 call / 300s. We cache the token
// in the DB and refresh with a 24h safety buffer before expiry.

import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

const CJ_BASE = 'https://developers.cjdropshipping.com/api2.0/v1'

interface CjResponse<T> {
  code: number
  result: boolean
  message: string
  data: T
}

async function fetchNewToken(): Promise<{ token: string; expiresAt: Date }> {
  const res = await fetch(`${CJ_BASE}/authentication/getAccessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.CJ_EMAIL,
      password: process.env.CJ_API_KEY,
    }),
  })

  const json = (await res.json()) as CjResponse<{
    accessToken: string
    accessTokenExpiryDate: string
    refreshToken: string
  }>

  if (!json.result || !json.data?.accessToken) {
    throw new Error(`CJ auth failed: ${json.message}`)
  }

  const supabase = createAdminClient()
  const expiresAt = new Date(json.data.accessTokenExpiryDate)

  await supabase.from('cj_auth').upsert({
    id: 1,
    access_token: json.data.accessToken,
    access_token_expires_at: expiresAt.toISOString(),
    refresh_token: json.data.refreshToken,
    updated_at: new Date().toISOString(),
  })

  return { token: json.data.accessToken, expiresAt }
}

export async function getCjToken(): Promise<string> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('cj_auth')
    .select('access_token, access_token_expires_at')
    .eq('id', 1)
    .maybeSingle()

  // Token mit 24h Puffer vor Ablauf erneuern
  if (
    data?.access_token &&
    new Date(data.access_token_expires_at).getTime() - Date.now() > 24 * 60 * 60 * 1000
  ) {
    return data.access_token
  }

  const { token } = await fetchNewToken()
  return token
}

export async function cjRequest<T>(
  path: string,
  options: { method?: 'GET' | 'POST'; body?: unknown; query?: Record<string, string> } = {},
): Promise<T> {
  const token = await getCjToken()
  const url = new URL(`${CJ_BASE}${path}`)
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      url.searchParams.set(k, v)
    }
  }

  const res = await fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      'CJ-Access-Token': token,
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const json = (await res.json()) as CjResponse<T>
  if (!json.result) {
    throw new Error(`CJ API error (${json.code}) on ${path}: ${json.message}`)
  }
  return json.data
}
