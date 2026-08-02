// Purpose: TikTok-API-Request + Auth-Token-Management (HMAC-Signatur, OAuth-Refresh)
// Docs: docs/TIKTOK_SHOP_API_INTEGRATION.md
// SECURITY: server-only. Tokens liegen in tiktok_auth (nur Service-Role).

import 'server-only'

import { createHmac } from 'node:crypto'

import { createAdminClient } from '@/lib/supabase/admin'

const AUTH_BASE = 'https://auth.tiktok-shops.com'
export const API_BASE = 'https://open-api.tiktokglobalshop.com'
export const APP_KEY = process.env.TIKTOK_APP_KEY ?? ''
const APP_SECRET = process.env.TIKTOK_APP_SECRET ?? ''

interface TikTokTokenResponse {
  code: number
  message: string
  data?: {
    access_token: string
    access_token_expire_in: number
    refresh_token: string
    refresh_token_expire_in: number
  }
}

export interface TikTokApiResponse<T> {
  code: number
  message: string
  data: T
}

// HMAC-SHA256: sign + access_token NICHT mitsignieren; bei multipart Body NICHT signieren
function requireTikTokCredentials(): void {
  if (!APP_KEY || !APP_SECRET) {
    throw new Error('TikTok APP_KEY/APP_SECRET are not configured.')
  }
}

export function signRequest(params: {
  path: string
  query: Record<string, string>
  body?: string
}): string {
  requireTikTokCredentials()
  const sorted = Object.keys(params.query)
    .filter((k) => k !== 'sign' && k !== 'access_token')
    .sort()
    .map((k) => `${k}${params.query[k]}`)
    .join('')
  const input = `${APP_SECRET}${params.path}${sorted}${params.body ?? ''}${APP_SECRET}`
  return createHmac('sha256', APP_SECRET).update(input).digest('hex')
}

async function persistTokens(data: NonNullable<TikTokTokenResponse['data']>): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('tiktok_auth').upsert({
    id: 1,
    access_token: data.access_token,
    access_token_expires_at: new Date(data.access_token_expire_in * 1000).toISOString(),
    refresh_token: data.refresh_token,
    refresh_token_expires_at: new Date(data.refresh_token_expire_in * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  })
  if (error) throw new Error(`TikTok token persistence failed: ${error.message}`)
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  requireTikTokCredentials()
  const url = new URL(`${AUTH_BASE}/api/v2/token/refresh`)
  url.searchParams.set('app_key', APP_KEY)
  url.searchParams.set('app_secret', APP_SECRET)
  url.searchParams.set('refresh_token', refreshToken)
  url.searchParams.set('grant_type', 'refresh_token')

  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  const json = (await res.json().catch(() => null)) as TikTokTokenResponse | null
  if (!res.ok || !json || json.code !== 0 || !json.data?.access_token) {
    throw new Error(`TikTok token refresh failed: ${json?.message ?? `HTTP ${res.status}`}`)
  }

  await persistTokens(json.data)
  return json.data.access_token
}

export async function getTikTokToken(): Promise<string> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('tiktok_auth')
    .select('access_token, access_token_expires_at, refresh_token, refresh_token_expires_at')
    .eq('id', 1)
    .maybeSingle()

  if (error) throw new Error(`TikTok auth lookup failed: ${error.message}`)
  if (!data?.access_token) {
    throw new Error(
      'TikTok nicht autorisiert. Seller muss die App autorisieren (siehe /api/tiktok/oauth/callback).',
    )
  }

  if (new Date(data.access_token_expires_at).getTime() - Date.now() > 24 * 60 * 60 * 1000) {
    return data.access_token
  }
  if (new Date(data.refresh_token_expires_at).getTime() < Date.now()) {
    throw new Error('TikTok refresh_token abgelaufen — Seller muss die App neu autorisieren.')
  }
  return refreshAccessToken(data.refresh_token)
}

export async function getShopCipher(): Promise<string> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('tiktok_auth')
    .select('shop_cipher')
    .eq('id', 1)
    .maybeSingle()
  if (error) throw new Error(`TikTok shop lookup failed: ${error.message}`)
  if (data?.shop_cipher) return data.shop_cipher

  const shops = await tiktokRequestInner<{
    shops: Array<{ id: string; cipher: string; name: string; region: string }>
  }>('/authorization/202309/shops', { method: 'GET', withShopCipher: false })

  const shop = shops.shops?.[0]
  if (!shop) throw new Error('Kein autorisierter TikTok Shop gefunden.')

  const { error: updateError } = await supabase
    .from('tiktok_auth')
    .update({ shop_cipher: shop.cipher, shop_id: shop.id, updated_at: new Date().toISOString() })
    .eq('id', 1)
  if (updateError) throw new Error(`TikTok shop persistence failed: ${updateError.message}`)
  return shop.cipher
}

export async function exchangeAuthCode(authCode: string): Promise<void> {
  requireTikTokCredentials()
  if (!authCode || authCode.length > 2048) throw new Error('Invalid TikTok auth code.')
  const url = new URL(`${AUTH_BASE}/api/v2/token/get`)
  url.searchParams.set('app_key', APP_KEY)
  url.searchParams.set('app_secret', APP_SECRET)
  url.searchParams.set('auth_code', authCode)
  url.searchParams.set('grant_type', 'authorized_code')

  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  const json = (await res.json().catch(() => null)) as TikTokTokenResponse | null
  if (!res.ok || !json || json.code !== 0 || !json.data?.access_token) {
    throw new Error(`TikTok auth failed: ${json?.message ?? `HTTP ${res.status}`}`)
  }
  await persistTokens(json.data)
}

export async function tiktokRequestInner<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    body?: unknown
    query?: Record<string, string>
    withShopCipher?: boolean
  } = {},
): Promise<T> {
  requireTikTokCredentials()
  const token = await getTikTokToken()
  const query: Record<string, string> = {
    app_key: APP_KEY,
    timestamp: String(Math.floor(Date.now() / 1000)),
    ...(options.query ?? {}),
  }
  if (options.withShopCipher !== false) {
    query.shop_cipher = await getShopCipher()
  }

  const bodyString = options.body ? JSON.stringify(options.body) : undefined
  query.sign = signRequest({ path, query, body: bodyString })

  const url = new URL(`${API_BASE}${path}`)
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v)

  const res = await fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      'x-tts-access-token': token,
      'Content-Type': 'application/json',
    },
    body: bodyString,
    signal: AbortSignal.timeout(30_000),
  })

  const json = (await res.json().catch(() => null)) as TikTokApiResponse<T> | null
  if (!res.ok || !json || json.code !== 0) {
    throw new Error(
      `TikTok API error (${json?.code ?? res.status}) on ${path}: ${json?.message ?? 'invalid response'}`,
    )
  }
  return json.data
}
