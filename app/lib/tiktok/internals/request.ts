// Purpose: TikTok-API-Request + Auth-Token-Management (HMAC-Signatur, OAuth-Refresh)
// Docs: docs/TIKTOK_SHOP_API_INTEGRATION.md
// SECURITY: server-only. Tokens liegen in tiktok_auth (nur Service-Role).

import 'server-only'

import { createHmac } from 'node:crypto'

import { createAdminClient } from '@/lib/supabase/admin'

const AUTH_BASE = 'https://auth.tiktok-shops.com'
export const API_BASE = 'https://open-api.tiktokglobalshops.com'
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
export function signRequest(params: {
  path: string
  query: Record<string, string>
  body?: string
}): string {
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
  await supabase.from('tiktok_auth').upsert({
    id: 1,
    access_token: data.access_token,
    access_token_expires_at: new Date(data.access_token_expire_in * 1000).toISOString(),
    refresh_token: data.refresh_token,
    refresh_token_expires_at: new Date(data.refresh_token_expire_in * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  })
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const url = new URL(`${AUTH_BASE}/api/v2/token/refresh`)
  url.searchParams.set('app_key', APP_KEY)
  url.searchParams.set('app_secret', APP_SECRET)
  url.searchParams.set('refresh_token', refreshToken)
  url.searchParams.set('grant_type', 'refresh_token')

  const res = await fetch(url)
  const json = (await res.json()) as TikTokTokenResponse
  if (json.code !== 0 || !json.data?.access_token) {
    throw new Error(`TikTok token refresh failed: ${json.message}`)
  }

  await persistTokens(json.data)
  return json.data.access_token
}

export async function getTikTokToken(): Promise<string> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('tiktok_auth')
    .select('access_token, access_token_expires_at, refresh_token, refresh_token_expires_at')
    .eq('id', 1)
    .maybeSingle()

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
  const { data } = await supabase
    .from('tiktok_auth')
    .select('shop_cipher')
    .eq('id', 1)
    .maybeSingle()
  if (data?.shop_cipher) return data.shop_cipher

  const shops = await tiktokRequestInner<{
    shops: Array<{ id: string; cipher: string; name: string; region: string }>
  }>('/authorization/202309/shops', { method: 'GET', withShopCipher: false })

  const shop = shops.shops?.[0]
  if (!shop) throw new Error('Kein autorisierter TikTok Shop gefunden.')

  await supabase
    .from('tiktok_auth')
    .update({ shop_cipher: shop.cipher, shop_id: shop.id })
    .eq('id', 1)
  return shop.cipher
}

export async function exchangeAuthCode(authCode: string): Promise<void> {
  const url = new URL(`${AUTH_BASE}/api/v2/token/get`)
  url.searchParams.set('app_key', APP_KEY)
  url.searchParams.set('app_secret', APP_SECRET)
  url.searchParams.set('auth_code', authCode)
  url.searchParams.set('grant_type', 'authorized_code')

  const res = await fetch(url)
  const json = (await res.json()) as TikTokTokenResponse
  if (json.code !== 0 || !json.data?.access_token) {
    throw new Error(`TikTok auth failed: ${json.message}`)
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
  })

  const json = (await res.json()) as TikTokApiResponse<T>
  if (json.code !== 0) {
    throw new Error(`TikTok API error (${json.code}) on ${path}: ${json.message}`)
  }
  return json.data
}
