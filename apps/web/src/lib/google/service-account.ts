import { readFile } from 'node:fs/promises'
import { importPKCS8, SignJWT } from 'jose'

export type GoogleServiceAccount = {
  clientEmail: string
  privateKey: string
  tokenURI: string
}

type GoogleTokenResponse = {
  access_token?: string
  expires_in?: number
}

type RawGoogleServiceAccount = {
  client_email?: string
  private_key?: string
  token_uri?: string
}

function normalizeGoogleServiceAccount(input: RawGoogleServiceAccount): GoogleServiceAccount {
  const clientEmail = String(input.client_email || '').trim()
  const privateKey = String(input.private_key || '').trim()
  const tokenURI = String(input.token_uri || 'https://oauth2.googleapis.com/token').trim()

  if (!clientEmail || !privateKey) {
    throw new Error('google_service_account_incomplete')
  }

  return {
    clientEmail,
    privateKey,
    tokenURI,
  }
}

export async function loadGoogleServiceAccount(): Promise<GoogleServiceAccount> {
  const encoded = String(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64 || '').trim()
  if (encoded) {
    try {
      const decoded = Buffer.from(encoded, 'base64').toString('utf8')
      return normalizeGoogleServiceAccount(JSON.parse(decoded) as RawGoogleServiceAccount)
    } catch {
      throw new Error('google_service_account_b64_invalid')
    }
  }

  const filePath = String(process.env.GOOGLE_SERVICE_ACCOUNT_FILE || '').trim()
  if (!filePath) {
    throw new Error('google_service_account_missing')
  }

  try {
    const content = await readFile(filePath, 'utf8')
    return normalizeGoogleServiceAccount(JSON.parse(content) as RawGoogleServiceAccount)
  } catch {
    throw new Error('google_service_account_file_invalid')
  }
}

export async function requestGoogleServiceAccountAccessToken(scopes: string[]): Promise<{
  accessToken: string
  expiresIn: number
}> {
  const serviceAccount = await loadGoogleServiceAccount()
  const now = Math.floor(Date.now() / 1000)
  const signingKey = await importPKCS8(serviceAccount.privateKey, 'RS256')

  const assertion = await new SignJWT({ scope: scopes.join(' ') })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(serviceAccount.clientEmail)
    .setSubject(serviceAccount.clientEmail)
    .setAudience(serviceAccount.tokenURI)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(signingKey)

  const response = await fetch(serviceAccount.tokenURI, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }).toString(),
  })

  const payload = (await response.json().catch(() => ({}))) as GoogleTokenResponse & { error?: string; error_description?: string }
  if (!response.ok || !String(payload.access_token || '').trim()) {
    throw new Error(
      String(payload.error_description || payload.error || `google_access_token_failed:${response.status}`).trim() || 'google_access_token_failed',
    )
  }

  return {
    accessToken: String(payload.access_token || '').trim(),
    expiresIn: Number(payload.expires_in || 3600),
  }
}
