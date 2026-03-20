import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { importPKCS8, SignJWT } from 'jose'

export const DEFAULT_GOOGLE_TOKEN_URI = 'https://oauth2.googleapis.com/token'
export const DEFAULT_GOOGLE_DOCS_API_BASE = 'https://docs.googleapis.com'
export const DEFAULT_LOCAL_GOOGLE_SERVICE_ACCOUNT_FILE = path.join(
  os.homedir(),
  'dev',
  'Meine-Google-Credentials',
  'credentials.json',
)
export const DEFAULT_LOCAL_GOOGLE_USER_OAUTH_FILE = path.join(
  os.homedir(),
  '.config',
  'google',
  'sin-google-apps',
  'accounts',
  'private-main',
  'user-oauth.json',
)
export const DEFAULT_LOCAL_GOOGLE_OAUTH_CLIENT_FILE = path.join(
  os.homedir(),
  '.config',
  'google',
  'sin-google-apps-oauth-client.json',
)

export function hasGoogleServiceAccount({
  encoded = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64,
  filePath = process.env.GOOGLE_SERVICE_ACCOUNT_FILE,
  fallbackFilePath = DEFAULT_LOCAL_GOOGLE_SERVICE_ACCOUNT_FILE,
} = {}) {
  if (String(encoded || '').trim()) {
    return true
  }
  const candidate = String(filePath || fallbackFilePath || '').trim()
  return Boolean(candidate && fs.existsSync(candidate))
}

export function loadGoogleServiceAccount({
  encoded = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64,
  filePath = process.env.GOOGLE_SERVICE_ACCOUNT_FILE,
  fallbackFilePath = DEFAULT_LOCAL_GOOGLE_SERVICE_ACCOUNT_FILE,
} = {}) {
  const encodedValue = String(encoded || '').trim()
  if (encodedValue) {
    try {
      return normalizeGoogleServiceAccount(JSON.parse(Buffer.from(encodedValue, 'base64').toString('utf8')))
    } catch {
      throw new Error('google_service_account_b64_invalid')
    }
  }

  const candidate = String(filePath || fallbackFilePath || '').trim()
  if (!candidate) {
    throw new Error('google_service_account_missing')
  }

  try {
    return normalizeGoogleServiceAccount(JSON.parse(fs.readFileSync(candidate, 'utf8')))
  } catch {
    throw new Error('google_service_account_file_invalid')
  }
}

export function loadGoogleUserOAuth({
  filePath = process.env.GOOGLE_USER_OAUTH_FILE,
  fallbackFilePath = DEFAULT_LOCAL_GOOGLE_USER_OAUTH_FILE,
} = {}) {
  const candidate = String(filePath || fallbackFilePath || '').trim()
  if (!candidate) {
    throw new Error('google_user_oauth_missing')
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(candidate, 'utf8'))
    const oauthClient = loadGoogleOAuthClient()
    const clientId = String(parsed?.client_id || oauthClient?.clientId || '').trim()
    const clientSecret = String(parsed?.client_secret || oauthClient?.clientSecret || '').trim()
    const refreshToken = String(parsed?.refresh_token || '').trim()
    const tokenURI = String(parsed?.token_uri || oauthClient?.tokenURI || DEFAULT_GOOGLE_TOKEN_URI).trim()
    const accessToken = String(parsed?.access_token || '').trim()
    const expiryDate = Number(parsed?.expiry_date || 0)
    const scope = String(parsed?.scope || '').trim()

    if ((!accessToken || expiryDate <= Date.now() + 60_000) && (!clientId || !clientSecret || !refreshToken || !tokenURI)) {
      throw new Error('google_user_oauth_incomplete')
    }

    return {
      filePath: candidate,
      clientId,
      clientSecret,
      refreshToken,
      tokenURI,
      accessToken,
      expiryDate,
      scope,
      oauthClient,
      raw: parsed,
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'google_user_oauth_incomplete') {
      throw error
    }
    throw new Error('google_user_oauth_file_invalid')
  }
}

export function loadGoogleOAuthClient({
  filePath = process.env.GOOGLE_OAUTH_CLIENT_FILE,
  fallbackFilePath = DEFAULT_LOCAL_GOOGLE_OAUTH_CLIENT_FILE,
} = {}) {
  const candidate = String(filePath || fallbackFilePath || '').trim()
  if (!candidate || !fs.existsSync(candidate)) {
    return null
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(candidate, 'utf8'))
    const profile = parsed?.installed || parsed?.web || parsed || {}
    const clientId = String(profile?.client_id || '').trim()
    const clientSecret = String(profile?.client_secret || '').trim()
    const tokenURI = String(profile?.token_uri || DEFAULT_GOOGLE_TOKEN_URI).trim()
    if (!clientId || !clientSecret) {
      return null
    }
    return {
      clientId,
      clientSecret,
      tokenURI,
      raw: parsed,
    }
  } catch {
    return null
  }
}

export function normalizeGoogleServiceAccount(input) {
  const clientEmail = String(input?.client_email || '').trim()
  const privateKey = String(input?.private_key || '').trim()
  const tokenURI = String(input?.token_uri || DEFAULT_GOOGLE_TOKEN_URI).trim()
  const projectId = String(input?.project_id || '').trim()

  if (!clientEmail || !privateKey) {
    throw new Error('google_service_account_incomplete')
  }

  return {
    clientEmail,
    privateKey,
    tokenURI,
    projectId,
  }
}

export async function requestGoogleAccessToken({ serviceAccount, scopes }) {
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
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }).toString(),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !String(payload?.access_token || '').trim()) {
    throw new Error(String(payload?.error_description || payload?.error || `google_access_token_failed:${response.status}`).trim())
  }

  return String(payload.access_token || '').trim()
}

export async function requestGoogleUserAccessToken({ userOAuth, persistFilePath = userOAuth?.filePath } = {}) {
  const safeOAuth = userOAuth || loadGoogleUserOAuth({ filePath: persistFilePath, fallbackFilePath: '' })
  if (safeOAuth.accessToken && safeOAuth.expiryDate > Date.now() + 60_000) {
    return safeOAuth.accessToken
  }
  if (!safeOAuth.clientId || !safeOAuth.clientSecret || !safeOAuth.refreshToken || !safeOAuth.tokenURI) {
    throw new Error('google_user_oauth_incomplete')
  }

  const response = await fetch(safeOAuth.tokenURI, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: safeOAuth.clientId,
      client_secret: safeOAuth.clientSecret,
      refresh_token: safeOAuth.refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  })

  const payload = await response.json().catch(() => ({}))
  const accessToken = String(payload?.access_token || '').trim()
  if (!response.ok || !accessToken) {
    throw new Error(String(payload?.error_description || payload?.error || `google_user_access_token_failed:${response.status}`).trim())
  }

  if (persistFilePath) {
    const nextState = {
      ...safeOAuth.raw,
      access_token: accessToken,
      expiry_date: Date.now() + Number(payload?.expires_in || 3600) * 1000,
      scope: String(payload?.scope || safeOAuth.scope || '').trim(),
      token_uri: safeOAuth.tokenURI,
      client_id: safeOAuth.clientId,
      client_secret: safeOAuth.clientSecret,
      refresh_token: safeOAuth.refreshToken,
    }
    fs.writeFileSync(persistFilePath, `${JSON.stringify(nextState, null, 2)}\n`, 'utf8')
  }

  return accessToken
}

export async function fetchGoogleDocument({
  documentId,
  accessToken,
  apiBase = DEFAULT_GOOGLE_DOCS_API_BASE,
  includeTabsContent = false,
}) {
  const suffix = includeTabsContent ? '?includeTabsContent=true' : ''
  const response = await fetch(`${String(apiBase).replace(/\/$/, '')}/v1/documents/${encodeURIComponent(documentId)}${suffix}`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: 'application/json',
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(String(payload?.error?.message || `google_document_read_failed:${response.status}`).trim())
  }
  return payload
}

export async function batchUpdateGoogleDocument({
  documentId,
  accessToken,
  requests,
  apiBase = DEFAULT_GOOGLE_DOCS_API_BASE,
}) {
  const response = await fetch(`${String(apiBase).replace(/\/$/, '')}/v1/documents/${encodeURIComponent(documentId)}:batchUpdate`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(String(payload?.error?.message || `google_document_update_failed:${response.status}`).trim())
  }
  return payload
}

export function flattenGoogleDocElements(elements) {
  const out = []
  for (const element of elements || []) {
    if (Array.isArray(element?.paragraph?.elements)) {
      out.push(
        element.paragraph.elements
          .map((entry) => String(entry?.textRun?.content || ''))
          .join('')
          .replace(/\u000b/g, '\n'),
      )
      continue
    }
    if (Array.isArray(element?.table?.tableRows)) {
      for (const row of element.table.tableRows) {
        for (const cell of row.tableCells || []) {
          out.push(flattenGoogleDocElements(cell.content || []))
        }
      }
      continue
    }
    if (Array.isArray(element?.tableOfContents?.content)) {
      out.push(flattenGoogleDocElements(element.tableOfContents.content))
    }
  }
  return out.join('')
}

export function getGoogleDocInsertIndex(content) {
  const safeContent = Array.isArray(content) ? content : []
  const endIndex = Number(safeContent[safeContent.length - 1]?.endIndex || 1)
  return endIndex > 1 ? endIndex - 1 : 1
}

export function findGoogleDocTabByTitle(tabs, targetTitle) {
  for (const tab of tabs || []) {
    if (String(tab?.tabProperties?.title || '').trim() === String(targetTitle || '').trim()) {
      return tab
    }
    const childMatch = findGoogleDocTabByTitle(tab?.childTabs || [], targetTitle)
    if (childMatch) {
      return childMatch
    }
  }
  return null
}

export function findGoogleDocTabById(tabs, targetTabId) {
  for (const tab of tabs || []) {
    if (String(tab?.tabProperties?.tabId || '').trim() === String(targetTabId || '').trim()) {
      return tab
    }
    const childMatch = findGoogleDocTabById(tab?.childTabs || [], targetTabId)
    if (childMatch) {
      return childMatch
    }
  }
  return null
}
