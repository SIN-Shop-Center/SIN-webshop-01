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
