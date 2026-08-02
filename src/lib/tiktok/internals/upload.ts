// Purpose: TikTok Multipart-Upload (Bilder) — Body wird NICHT signiert
// Docs: docs/TIKTOK_SHOP_API_INTEGRATION.md

import 'server-only'

import {
  APP_KEY,
  signRequest,
  tiktokRequestInner,
  getTikTokToken,
  API_BASE,
  TikTokApiResponse,
} from './request'

export async function tiktokUpload<T>(path: string, form: FormData): Promise<T> {
  const token = await getTikTokToken()
  const query: Record<string, string> = {
    app_key: APP_KEY,
    timestamp: String(Math.floor(Date.now() / 1000)),
  }
  query.sign = signRequest({ path, query })

  const url = new URL(`${API_BASE}${path}`)
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v)

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'x-tts-access-token': token },
    body: form,
  })

  const json = (await res.json()) as TikTokApiResponse<T>
  if (json.code !== 0) {
    throw new Error(`TikTok upload error (${json.code}) on ${path}: ${json.message}`)
  }
  return json.data
}

export { tiktokRequestInner as tiktokRequest }
