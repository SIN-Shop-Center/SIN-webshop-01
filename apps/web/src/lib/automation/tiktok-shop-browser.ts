import { lookup } from 'node:dns/promises'
import { existsSync } from 'node:fs'
import { isIP } from 'node:net'
import path from 'node:path'
import { getSessionFilePath, loadSessionSummaries, readSessionFile, sessionFileExists } from '@/session-persistence-files'
import type { SessionData } from '@/session-persistence-types'

export type GenericRecord = Record<string, unknown>

export type TikTokBrowserMetadataRequest = {
  target_url?: string
  current_url?: string
  candidate_urls?: unknown
  browser_session_ref?: string
  html?: string
  title?: string
  extracted?: GenericRecord
  metadata?: GenericRecord
  available_shops?: unknown
  shops?: unknown
  browser_recipe?: GenericRecord
  request_payload?: GenericRecord
}

export type TikTokBrowserMetadataResult = {
  status: 'completed' | 'empty'
  merchant_id: string
  seller_id: string
  shop_id: string
  shop_cipher: string
  third_shop_id: string
  shop_name: string
  shop_region: string
  browser_session_ref: string
  source_url: string
  available_shops: GenericRecord[]
  inspected_urls: string[]
  errors: string[]
  harvest_mode: 'provided' | 'browser' | 'http' | 'empty'
}

const MAX_CANDIDATE_URLS = 6
const MAX_HTML_CHARS = 1_200_000
const MAX_JSON_ITEMS = 12
const MAX_RECURSION_DEPTH = 6
const FETCH_TIMEOUT_MS = 15_000
const BROWSER_TIMEOUT_MS = 25_000
const BLOCKED_HOST_SUFFIXES = ['.local', '.internal', '.localhost']
const TIKTOK_ALLOWED_HOSTS = ['tiktok.com', 'tiktokglobalshop.com', 'byteoversea.com', 'tiktokv.com']

export function resolveTikTokAutomationSecrets(): string[] {
  return [
    process.env.TIKTOK_BROWSER_RUNNER_TOKEN,
    process.env.N8N_SHARED_SECRET,
    process.env.SUPPLIER_WEBHOOK_SECRET,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
}

export function validateTikTokAutomationToken(token: string): boolean {
  const secrets = resolveTikTokAutomationSecrets()
  if (secrets.length === 0) {
    return process.env.NODE_ENV !== 'production'
  }
  return secrets.includes(token.trim())
}

export async function harvestTikTokBrowserMetadata(request: TikTokBrowserMetadataRequest): Promise<TikTokBrowserMetadataResult> {
  const provided = normalizeTikTokBrowserMetadata(request)
  const candidateUrls = normalizeTikTokURLCandidates(request, provided)
  const sessionState = await loadTikTokSessionData(firstText(request.browser_session_ref)).catch((error) => ({
    session: null,
    error: error instanceof Error ? error.message : String(error),
  }))

  let best: TikTokBrowserMetadataResult = {
    ...provided,
    browser_session_ref: firstText(provided.browser_session_ref, sessionState.session?.sessionId),
    inspected_urls: normalizeStrings(provided.inspected_urls, candidateUrls),
    errors: sessionState.error ? [sessionState.error] : [],
    harvest_mode: provided.status === 'completed' ? 'provided' : 'empty',
  }

  if (candidateUrls.length === 0) {
    return best
  }

  const browserResult = await harvestTikTokViaBrowser({
    candidateUrls,
    request,
    sessionData: sessionState.session,
  }).catch((error) => ({
    ...emptyTikTokResult(),
    browser_session_ref: firstText(request.browser_session_ref, sessionState.session?.sessionId),
    inspected_urls: candidateUrls,
    errors: [error instanceof Error ? error.message : String(error)],
    harvest_mode: 'empty' as const,
  }))
  best = mergeTikTokBrowserResults(best, browserResult)

  if (best.status !== 'completed') {
    const fetchResult = await harvestTikTokViaHTTP({
      candidateUrls,
      request,
      sessionData: sessionState.session,
    }).catch((error) => ({
      ...emptyTikTokResult(),
      browser_session_ref: firstText(request.browser_session_ref, sessionState.session?.sessionId),
      inspected_urls: candidateUrls,
      errors: [error instanceof Error ? error.message : String(error)],
      harvest_mode: 'empty' as const,
    }))
    best = mergeTikTokBrowserResults(best, fetchResult)
  }

  return {
    ...best,
    browser_session_ref: firstText(best.browser_session_ref, request.browser_session_ref, sessionState.session?.sessionId),
    inspected_urls: normalizeStrings(best.inspected_urls, candidateUrls),
    errors: normalizeStrings(best.errors),
    harvest_mode: best.status === 'completed' ? best.harvest_mode : best.harvest_mode === 'empty' ? 'empty' : best.harvest_mode,
  }
}

export function normalizeTikTokBrowserMetadata(request: TikTokBrowserMetadataRequest): TikTokBrowserMetadataResult {
  const html = asText(request.html)
  const extracted = asRecord(request.extracted)
  const metadata = asRecord(request.metadata)
  const extractedText = safeJSONStringify(extracted)
  const metadataText = safeJSONStringify(metadata)
  const sourceBlob = [html, extractedText, metadataText].filter(Boolean).join('\n')
  const sourceUrl = firstText(request.current_url, request.target_url, extracted.source_url, metadata.source_url)
  const merchantId = firstText(
    extracted.merchant_id,
    extracted.merchantId,
    metadata.merchant_id,
    metadata.merchantId,
    findValueInText(sourceBlob, ['merchant_id', 'merchantId', 'seller_id', 'sellerId']),
  )
  const sellerId = firstText(
    extracted.seller_id,
    extracted.sellerId,
    metadata.seller_id,
    metadata.sellerId,
    merchantId,
    findValueInText(sourceBlob, ['seller_id', 'sellerId', 'merchant_id', 'merchantId']),
  )
  const shopId = firstText(
    extracted.shop_id,
    extracted.shopId,
    metadata.shop_id,
    metadata.shopId,
    findValueInText(sourceBlob, ['shop_id', 'shopId']),
  )
  const shopCipher = firstText(
    extracted.shop_cipher,
    extracted.third_shop_id,
    extracted.shopCipher,
    metadata.shop_cipher,
    metadata.third_shop_id,
    metadata.shopCipher,
    findValueInText(sourceBlob, ['shop_cipher', 'shopCipher', 'third_shop_id', 'thirdShopId']),
  )
  const thirdShopId = firstText(
    extracted.third_shop_id,
    extracted.thirdShopId,
    metadata.third_shop_id,
    metadata.thirdShopId,
    shopCipher,
    findValueInText(sourceBlob, ['third_shop_id', 'thirdShopId', 'shop_cipher', 'shopCipher']),
  )
  const shopName = firstText(
    extracted.shop_name,
    extracted.shopName,
    metadata.shop_name,
    metadata.shopName,
    findValueInText(sourceBlob, ['shop_name', 'shopName']),
    extractTitleTag(html),
    asText(request.title),
  )
  const shopRegion = firstText(
    extracted.shop_region,
    extracted.shopRegion,
    extracted.region,
    metadata.shop_region,
    metadata.shopRegion,
    metadata.region,
    findValueInText(sourceBlob, ['shop_region', 'shopRegion', 'region']),
  )

  const availableShops = normalizeShopItems(
    firstNonNil(
      request.available_shops,
      request.shops,
      extracted.available_shops,
      extracted.shops,
      metadata.available_shops,
      metadata.shops,
      extractShopCandidatesFromHTML(html),
      extractShopCandidatesFromUnknown(extracted),
      extractShopCandidatesFromUnknown(metadata),
    ),
  )

  if (availableShops.length === 0 && (merchantId || shopId || shopCipher || shopName)) {
    availableShops.push(compactShopItem({
      merchant_id: merchantId,
      seller_id: sellerId || merchantId,
      shop_id: shopId,
      shop_cipher: shopCipher || thirdShopId,
      third_shop_id: thirdShopId || shopCipher,
      shop_name: shopName,
      shop_region: shopRegion,
    }))
  }

  return {
    status: merchantId || shopId || shopCipher || availableShops.length > 0 ? 'completed' : 'empty',
    merchant_id: merchantId,
    seller_id: sellerId || merchantId,
    shop_id: shopId,
    shop_cipher: shopCipher || thirdShopId,
    third_shop_id: thirdShopId || shopCipher,
    shop_name: shopName,
    shop_region: shopRegion,
    browser_session_ref: firstText(request.browser_session_ref, extracted.browser_session_ref, metadata.browser_session_ref),
    source_url: sourceUrl,
    available_shops: availableShops,
    inspected_urls: normalizeStrings(request.candidate_urls, request.target_url, request.current_url, sourceUrl),
    errors: [],
    harvest_mode: merchantId || shopId || availableShops.length > 0 ? 'provided' : 'empty',
  }
}

async function harvestTikTokViaBrowser(input: {
  candidateUrls: string[]
  request: TikTokBrowserMetadataRequest
  sessionData: SessionData | null
}): Promise<TikTokBrowserMetadataResult> {
  const connection = await createTikTokBrowserConnection()
  if (!connection) {
    return {
      ...emptyTikTokResult(),
      browser_session_ref: firstText(input.request.browser_session_ref, input.sessionData?.sessionId),
      inspected_urls: input.candidateUrls,
      errors: [],
      harvest_mode: 'empty',
    }
  }

  const errors: string[] = []
  let best = emptyTikTokResult()
  let page: import('playwright-core').Page | null = null
  try {
    const context = await connection.prepareContext(input.sessionData)
    page = await context.newPage()
    const settleMs = resolvePositiveInt(input.request.browser_recipe?.settle_ms, 1200)
    const waitForSelector = asText(input.request.browser_recipe?.wait_for_selector)

    for (const rawUrl of input.candidateUrls) {
      const currentUrl = await assertSafeTikTokURL(rawUrl)
      try {
        await page.goto(currentUrl.toString(), {
          waitUntil: 'domcontentloaded',
          timeout: BROWSER_TIMEOUT_MS,
        })
        if (waitForSelector) {
          await page.waitForSelector(waitForSelector, { timeout: Math.min(BROWSER_TIMEOUT_MS, 10_000) }).catch(() => undefined)
        }
        await page.waitForLoadState('networkidle', { timeout: Math.min(BROWSER_TIMEOUT_MS, 8_000) }).catch(() => undefined)
        if (settleMs > 0) {
          await page.waitForTimeout(Math.min(settleMs, 5_000))
        }
        const snapshot = await extractPlaywrightSnapshot(page)
        const result = normalizeTikTokBrowserMetadata({
          ...input.request,
          ...snapshot,
          browser_session_ref: firstText(input.request.browser_session_ref, input.sessionData?.sessionId),
          candidate_urls: input.candidateUrls,
        })
        best = mergeTikTokBrowserResults(best, {
          ...result,
          inspected_urls: normalizeStrings(best.inspected_urls, result.inspected_urls, currentUrl.toString()),
          errors: [],
          harvest_mode: 'browser',
        })
        if (result.status === 'completed' && scoreTikTokBrowserResult(result) >= 6) {
          break
        }
      } catch (error) {
        errors.push(`${currentUrl}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  } finally {
    await page?.close().catch(() => undefined)
    await connection.close()
  }

  return {
    ...best,
    browser_session_ref: firstText(best.browser_session_ref, input.request.browser_session_ref, input.sessionData?.sessionId),
    inspected_urls: normalizeStrings(best.inspected_urls, input.candidateUrls),
    errors,
    harvest_mode: best.status === 'completed' ? 'browser' : 'empty',
  }
}

async function harvestTikTokViaHTTP(input: {
  candidateUrls: string[]
  request: TikTokBrowserMetadataRequest
  sessionData: SessionData | null
}): Promise<TikTokBrowserMetadataResult> {
  const errors: string[] = []
  let best = emptyTikTokResult()

  for (const rawUrl of input.candidateUrls) {
    let targetUrl: URL
    try {
      targetUrl = await assertSafeTikTokURL(rawUrl)
    } catch (error) {
      errors.push(`${rawUrl}: ${error instanceof Error ? error.message : String(error)}`)
      continue
    }

    try {
      const response = await fetchTikTokHTML(targetUrl, input.sessionData)
      const result = normalizeTikTokBrowserMetadata({
        ...input.request,
        browser_session_ref: firstText(input.request.browser_session_ref, input.sessionData?.sessionId),
        current_url: response.current_url,
        target_url: targetUrl.toString(),
        title: response.title,
        html: response.html,
        metadata: {
          session_url: input.sessionData?.url || '',
          session_hint: input.sessionData?.formData || {},
        },
        candidate_urls: input.candidateUrls,
      })
      best = mergeTikTokBrowserResults(best, {
        ...result,
        inspected_urls: normalizeStrings(best.inspected_urls, result.inspected_urls, response.current_url, targetUrl.toString()),
        errors: [],
        harvest_mode: 'http',
      })
      if (result.status === 'completed' && scoreTikTokBrowserResult(result) >= 5) {
        break
      }
    } catch (error) {
      errors.push(`${targetUrl}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return {
    ...best,
    browser_session_ref: firstText(best.browser_session_ref, input.request.browser_session_ref, input.sessionData?.sessionId),
    inspected_urls: normalizeStrings(best.inspected_urls, input.candidateUrls),
    errors,
    harvest_mode: best.status === 'completed' ? 'http' : 'empty',
  }
}

async function fetchTikTokHTML(url: URL, sessionData: SessionData | null): Promise<{ current_url: string; title: string; html: string }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const headers = new Headers({
      accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.5',
      'user-agent': firstText(sessionData?.metadata?.userAgent, 'Mozilla/5.0 SimoneTikTokMetadataHarvester/1.0'),
      'cache-control': 'no-cache',
      pragma: 'no-cache',
    })

    const cookieHeader = buildCookieHeader(url, sessionData)
    if (cookieHeader) {
      headers.set('cookie', cookieHeader)
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow',
      headers,
      signal: controller.signal,
      cache: 'no-store',
    })
    if (!response.ok) {
      throw new Error(`upstream_status_${response.status}`)
    }
    const html = await response.text()
    return {
      current_url: response.url,
      title: extractTitleTag(html),
      html: html.slice(0, MAX_HTML_CHARS),
    }
  } finally {
    clearTimeout(timeout)
  }
}

export async function createTikTokBrowserConnection(options?: {
  headless?: boolean
}): Promise<{
  prepareContext: (sessionData: SessionData | null) => Promise<import('playwright-core').BrowserContext>
  close: () => Promise<void>
} | null> {
  const cdpURL = firstText(process.env.TIKTOK_BROWSER_CDP_URL, process.env.BROWSER_CDP_WS_ENDPOINT)
  const executablePath = firstText(
    process.env.TIKTOK_BROWSER_EXECUTABLE_PATH,
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    resolveLocalTikTokBrowserExecutablePath(),
  )
  if (!cdpURL && !executablePath) {
    return null
  }

  const { chromium } = await importPlaywrightCore()
  const browser = cdpURL
    ? await chromium.connectOverCDP(cdpURL)
    : await chromium.launch({
        executablePath,
        headless: typeof options?.headless === 'boolean' ? options.headless : parseBoolean(process.env.TIKTOK_BROWSER_HEADLESS, true),
        timeout: BROWSER_TIMEOUT_MS,
      })

  return {
    prepareContext: async (sessionData) => {
      const existing = browser.contexts()[0]
      const context =
        existing ||
        (await browser.newContext({
          userAgent: firstText(sessionData?.metadata?.userAgent) || undefined,
          locale: firstText(sessionData?.metadata?.language) || undefined,
          viewport: sessionData?.metadata?.viewport,
        }))

      if (sessionData) {
        const cookies = toPlaywrightCookies(sessionData.cookies)
        if (cookies.length > 0) {
          await context.addCookies(cookies)
        }
        const localStorageEntries = filterStorageEntries(sessionData.localStorage)
        const sessionStorageEntries = filterStorageEntries(sessionData.sessionStorage)
        if (localStorageEntries.length > 0 || sessionStorageEntries.length > 0) {
          await context.addInitScript(
            ({ localStorageEntries: entriesLocal, sessionStorageEntries: entriesSession }) => {
              try {
                for (const [key, value] of entriesLocal) {
                  window.localStorage.setItem(key, value)
                }
              } catch {}
              try {
                for (const [key, value] of entriesSession) {
                  window.sessionStorage.setItem(key, value)
                }
              } catch {}
            },
            {
              localStorageEntries,
              sessionStorageEntries,
            },
          )
        }
      }
      return context
    },
    close: async () => {
      await browser.close().catch(() => undefined)
    },
  }
}

function resolveLocalTikTokBrowserExecutablePath() {
  const candidates =
    process.platform === 'darwin'
      ? [
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta',
          '/Applications/Chromium.app/Contents/MacOS/Chromium',
        ]
      : process.platform === 'win32'
        ? [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
          ]
        : [
            '/usr/bin/google-chrome',
            '/usr/bin/google-chrome-stable',
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser',
          ]

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate
    }
  }
  return ''
}

type PlaywrightCoreModule = typeof import('playwright-core')

async function importPlaywrightCore(): Promise<PlaywrightCoreModule> {
  // Keep Playwright out of the regular Next.js server bundle and resolve it only at runtime.
  const importer = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<PlaywrightCoreModule>
  return importer(['playwright', 'core'].join('-'))
}

async function extractPlaywrightSnapshot(page: import('playwright-core').Page): Promise<{
  current_url: string
  title: string
  html: string
  metadata: GenericRecord
  available_shops: GenericRecord[]
}> {
  const currentURL = page.url()
  const title = await page.title().catch(() => '')
  const html = await page.content().catch(() => '')
  const metadata = await page
    .evaluate(({ maxItems }) => {
      const safeClone = (value: unknown, depth = 0, seen = new WeakSet<object>()): unknown => {
        if (value === null || value === undefined) {
          return value
        }
        if (typeof value === 'string') {
          return value.length > 4000 ? value.slice(0, 4000) : value
        }
        if (typeof value === 'number' || typeof value === 'boolean') {
          return value
        }
        if (depth > 4) {
          return undefined
        }
        if (Array.isArray(value)) {
          return value.slice(0, maxItems).map((item) => safeClone(item, depth + 1, seen))
        }
        if (typeof value === 'object') {
          if (seen.has(value as object)) {
            return undefined
          }
          seen.add(value as object)
          const out: Record<string, unknown> = {}
          for (const [key, entry] of Object.entries(value as Record<string, unknown>).slice(0, 25)) {
            const next = safeClone(entry, depth + 1, seen)
            if (next !== undefined) {
              out[key] = next
            }
          }
          return out
        }
        return undefined
      }

      const pickStorage = (storage: Storage) => {
        const out: Record<string, string> = {}
        for (let index = 0; index < Math.min(storage.length, 30); index += 1) {
          const key = storage.key(index)
          if (!key) {
            continue
          }
          try {
            const value = storage.getItem(key)
            if (value !== null) {
              out[key] = value.slice(0, 2000)
            }
          } catch {}
        }
        return out
      }

      const globals: Record<string, unknown> = {}
      for (const key of ['__NEXT_DATA__', '__INITIAL_STATE__', '__SIGI_STATE__', 'SIGI_STATE', '__UNIVERSAL_DATA_FOR_REHYDRATION__']) {
        const value = (window as unknown as Record<string, unknown>)[key]
        if (value && typeof value === 'object') {
          const cloned = safeClone(value)
          if (cloned && typeof cloned === 'object') {
            globals[key] = cloned
          }
        }
      }

      return {
        globals,
        localStorage: pickStorage(window.localStorage),
        sessionStorage: pickStorage(window.sessionStorage),
      }
    }, { maxItems: MAX_JSON_ITEMS })
    .catch(() => ({}))

  const availableShops = normalizeShopItems(extractShopCandidatesFromUnknown(metadata))
  return {
    current_url: currentURL,
    title,
    html: html.slice(0, MAX_HTML_CHARS),
    metadata: asRecord(metadata),
    available_shops: availableShops,
  }
}

export async function loadTikTokSessionData(sessionId: string): Promise<{ session: SessionData | null; error?: string }> {
  for (const dataDir of resolveTikTokSessionDataDirs()) {
    try {
      if (sessionId) {
        const filePath = getSessionFilePath(dataDir, sessionId)
        if (sessionFileExists(filePath)) {
          return {
            session: JSON.parse(await readSessionFile(filePath)) as SessionData,
          }
        }
        continue
      }

      const sessions = await loadSessionSummaries(dataDir)
      const latest = sessions[0]
      if (!latest) {
        continue
      }
      const filePath = getSessionFilePath(dataDir, latest.sessionId)
      if (!sessionFileExists(filePath)) {
        continue
      }
      return {
        session: JSON.parse(await readSessionFile(filePath)) as SessionData,
      }
    } catch (error) {
      return {
        session: null,
        error: `session_data_load_failed:${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }
  return { session: null }
}

function resolveTikTokSessionDataDirs(): string[] {
  return normalizeStrings(
    process.env.TIKTOK_BROWSER_SESSION_DATA_DIR ? path.resolve(process.cwd(), process.env.TIKTOK_BROWSER_SESSION_DATA_DIR) : '',
    process.env.SESSION_PERSISTENCE_DATA_DIR ? path.resolve(process.cwd(), process.env.SESSION_PERSISTENCE_DATA_DIR) : '',
    path.resolve(process.cwd(), 'session-data'),
    path.resolve(process.cwd(), 'apps/web/session-data'),
  )
}

function normalizeTikTokURLCandidates(request: TikTokBrowserMetadataRequest, current: TikTokBrowserMetadataResult): string[] {
  const out = normalizeStrings(
    request.target_url,
    request.current_url,
    request.candidate_urls,
    request.request_payload?.target_url,
    request.request_payload?.current_url,
    request.request_payload?.seller_center_url,
    request.request_payload?.seller_url,
    request.request_payload?.shop_url,
    current.source_url,
  )

  if (out.length === 0) {
    out.push('https://seller.tiktokglobalshop.com/homepage')
  }
  return out.slice(0, MAX_CANDIDATE_URLS)
}

function mergeTikTokBrowserResults(current: TikTokBrowserMetadataResult, incoming: TikTokBrowserMetadataResult): TikTokBrowserMetadataResult {
  if (scoreTikTokBrowserResult(incoming) > scoreTikTokBrowserResult(current)) {
    return {
      ...incoming,
      inspected_urls: normalizeStrings(current.inspected_urls, incoming.inspected_urls),
      errors: normalizeStrings(current.errors, incoming.errors),
      available_shops: incoming.available_shops.length > 0 ? incoming.available_shops : current.available_shops,
    }
  }

  return {
    ...current,
    status: current.status === 'completed' || incoming.status !== 'completed' ? current.status : incoming.status,
    merchant_id: firstText(current.merchant_id, incoming.merchant_id),
    seller_id: firstText(current.seller_id, incoming.seller_id),
    shop_id: firstText(current.shop_id, incoming.shop_id),
    shop_cipher: firstText(current.shop_cipher, incoming.shop_cipher),
    third_shop_id: firstText(current.third_shop_id, incoming.third_shop_id),
    shop_name: firstText(current.shop_name, incoming.shop_name),
    shop_region: firstText(current.shop_region, incoming.shop_region),
    browser_session_ref: firstText(current.browser_session_ref, incoming.browser_session_ref),
    source_url: firstText(current.source_url, incoming.source_url),
    available_shops: current.available_shops.length > 0 ? current.available_shops : incoming.available_shops,
    inspected_urls: normalizeStrings(current.inspected_urls, incoming.inspected_urls),
    errors: normalizeStrings(current.errors, incoming.errors),
    harvest_mode: current.harvest_mode !== 'empty' ? current.harvest_mode : incoming.harvest_mode,
  }
}

function scoreTikTokBrowserResult(result: Pick<TikTokBrowserMetadataResult, 'status' | 'merchant_id' | 'shop_id' | 'shop_cipher' | 'shop_name' | 'available_shops'>) {
  return (
    (result.status === 'completed' ? 2 : 0) +
    (result.merchant_id ? 2 : 0) +
    (result.shop_id ? 2 : 0) +
    (result.shop_cipher ? 1 : 0) +
    (result.shop_name ? 1 : 0) +
    Math.min(result.available_shops.length, 3)
  )
}

function buildCookieHeader(url: URL, sessionData: SessionData | null) {
  if (!sessionData?.cookies?.length) {
    return ''
  }
  const pairs = sessionData.cookies
    .filter((cookie) => cookieMatchesURL(cookie, url))
    .filter((cookie) => cookie.value && cookie.value !== '[FILTERED]')
    .map((cookie) => `${cookie.name}=${cookie.value}`)
  return pairs.join('; ')
}

function toPlaywrightCookies(cookies: SessionData['cookies']): Array<{
  name: string
  value: string
  domain: string
  path: string
  expires?: number
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
}> {
  return cookies
    .filter((cookie) => cookie.value && cookie.value !== '[FILTERED]')
    .filter((cookie) => isAllowedTikTokHostname(cookie.domain))
    .map((cookie) => {
      const out: {
        name: string
        value: string
        domain: string
        path: string
        expires?: number
        httpOnly?: boolean
        secure?: boolean
        sameSite?: 'Strict' | 'Lax' | 'None'
      } = {
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path || '/',
      }
      if (typeof cookie.expires === 'number' && Number.isFinite(cookie.expires) && cookie.expires > 0) {
        out.expires = cookie.expires
      }
      if (typeof cookie.httpOnly === 'boolean') {
        out.httpOnly = cookie.httpOnly
      }
      if (typeof cookie.secure === 'boolean') {
        out.secure = cookie.secure
      }
      const sameSite = normalizeSameSite(cookie.sameSite)
      if (sameSite) {
        out.sameSite = sameSite
      }
      return out
    })
}

export async function assertSafeTikTokURL(rawURL: string): Promise<URL> {
  let parsed: URL
  try {
    parsed = new URL(rawURL)
  } catch {
    throw new Error('invalid_url')
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('unsupported_protocol')
  }
  if (!isAllowedTikTokHostname(parsed.hostname)) {
    throw new Error('unsupported_tiktok_host')
  }

  const records = await lookup(parsed.hostname, { all: true, verbatim: true })
  if (records.length === 0) {
    throw new Error('dns_resolution_failed')
  }
  for (const record of records) {
    if (isPrivateAddress(record.address)) {
      throw new Error('private_network_target_blocked')
    }
  }

  return parsed
}

function isAllowedTikTokHostname(hostname: string) {
  const value = hostname.trim().toLowerCase().replace(/^\.+/, '')
  if (!value || value === 'localhost' || BLOCKED_HOST_SUFFIXES.some((suffix) => value.endsWith(suffix))) {
    return false
  }
  return TIKTOK_ALLOWED_HOSTS.some((suffix) => value === suffix || value.endsWith(`.${suffix}`))
}

function cookieMatchesURL(
  cookie: Pick<SessionData['cookies'][number], 'domain' | 'path' | 'secure'>,
  url: URL,
) {
  const cookieDomain = String(cookie.domain || '').replace(/^\./, '').toLowerCase()
  const host = url.hostname.toLowerCase()
  const pathPrefix = String(cookie.path || '/')
  if (!cookieDomain || !(host === cookieDomain || host.endsWith(`.${cookieDomain}`))) {
    return false
  }
  if (cookie.secure && url.protocol !== 'https:') {
    return false
  }
  return url.pathname.startsWith(pathPrefix)
}

function isPrivateAddress(address: string): boolean {
  const version = isIP(address)
  if (version === 4) {
    const octets = address.split('.').map((part) => Number.parseInt(part, 10))
    if (octets.length !== 4 || octets.some((part) => Number.isNaN(part))) {
      return true
    }
    const [a, b] = octets
    if (a === 0 || a === 10 || a === 127) {
      return true
    }
    if (a === 169 && b === 254) {
      return true
    }
    if (a === 172 && b >= 16 && b <= 31) {
      return true
    }
    if (a === 192 && b === 168) {
      return true
    }
    if (a === 100 && b >= 64 && b <= 127) {
      return true
    }
    return false
  }

  if (version === 6) {
    const value = address.toLowerCase()
    return value === '::1' || value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe80:')
  }

  return true
}

function asText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function asRecord(value: unknown): GenericRecord {
  return value && typeof value === 'object' ? (value as GenericRecord) : {}
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = asText(value)
    if (text) {
      return text
    }
  }
  return ''
}

function firstNonNil(...values: unknown[]) {
  for (const value of values) {
    if (value !== undefined && value !== null) {
      return value
    }
  }
  return null
}

function normalizeStrings(...values: unknown[]) {
  const flat = values.flatMap((value) => (Array.isArray(value) ? value : [value]))
  const out: string[] = []
  for (const value of flat) {
    const text = asText(value)
    if (text && !out.includes(text)) {
      out.push(text)
    }
  }
  return out
}

function safeJSONStringify(value: unknown) {
  try {
    return JSON.stringify(value)
  } catch {
    return ''
  }
}

function findValueInText(text: string, keys: string[]) {
  const source = text || ''
  for (const key of keys) {
    const patterns = [
      new RegExp(`["']${escapeRegex(key)}["']\\s*[:=]\\s*["']([^"'\\s<>{}]+)["']`, 'i'),
      new RegExp(`${escapeRegex(key)}\\s*[:=]\\s*["']([^"'\\s<>{}]+)["']`, 'i'),
      new RegExp(`${escapeRegex(key)}\\s*[:=]\\s*([^"'\\s,}]+)`, 'i'),
    ]
    for (const pattern of patterns) {
      const match = source.match(pattern)
      const value = match?.[1]?.trim()
      if (value) {
        return value
      }
    }
  }
  return ''
}

function extractTitleTag(html: string) {
  const match = (html || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return match?.[1]?.replace(/\s+/g, ' ').trim() || ''
}

function extractShopCandidatesFromHTML(html: string): GenericRecord[] {
  if (!html) {
    return []
  }
  const candidates: GenericRecord[] = []
  const scripts = html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/gi) || []
  for (const block of scripts.slice(0, 30)) {
    const scriptBody = block.replace(/^<script\b[^>]*>/i, '').replace(/<\/script>$/i, '').trim()
    if (!scriptBody) {
      continue
    }
    const parsed = parseEmbeddedJSON(scriptBody)
    if (parsed !== null) {
      candidates.push(...extractShopCandidatesFromUnknown(parsed))
    }
  }
  return candidates
}

function parseEmbeddedJSON(input: string): unknown {
  const trimmed = input.trim()
  if (!trimmed) {
    return null
  }
  const direct = safeJSONParse(trimmed)
  if (direct !== null) {
    return direct
  }
  const assignmentMatch = trimmed.match(/(?:window\.)?[A-Za-z0-9_$.\[\]"]+\s*=\s*([\[{][\s\S]*[\]}])\s*;?$/)
  if (assignmentMatch?.[1]) {
    return safeJSONParse(assignmentMatch[1])
  }
  return null
}

function safeJSONParse(input: string): unknown {
  try {
    return JSON.parse(input)
  } catch {
    return null
  }
}

function extractShopCandidatesFromUnknown(value: unknown, depth = 0, out: GenericRecord[] = []): GenericRecord[] {
  if (depth > MAX_RECURSION_DEPTH || out.length >= MAX_JSON_ITEMS) {
    return out
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      extractShopCandidatesFromUnknown(item, depth + 1, out)
      if (out.length >= MAX_JSON_ITEMS) {
        break
      }
    }
    return out
  }
  if (!value || typeof value !== 'object') {
    return out
  }

  const record = value as GenericRecord
  const shopCandidate = compactShopItem({
    merchant_id: firstText(record.merchant_id, record.seller_id),
    seller_id: firstText(record.seller_id, record.merchant_id),
    shop_id: firstText(record.shop_id, record.id),
    shop_cipher: firstText(record.shop_cipher, record.third_shop_id),
    third_shop_id: firstText(record.third_shop_id, record.shop_cipher),
    shop_name: firstText(record.shop_name, record.shopName, record.name),
    shop_region: firstText(record.shop_region, record.shopRegion, record.region, record.country_code),
  })
  if (Object.keys(shopCandidate).length > 1) {
    out.push(shopCandidate)
    if (out.length >= MAX_JSON_ITEMS) {
      return out
    }
  }

  for (const [key, entry] of Object.entries(record)) {
    if (['available_shops', 'shops', 'shop_list', 'items', 'data', 'shop_base_info', 'shopsInfo'].includes(key) || depth < 2) {
      extractShopCandidatesFromUnknown(entry, depth + 1, out)
      if (out.length >= MAX_JSON_ITEMS) {
        break
      }
    }
  }
  return out
}

function normalizeShopItems(value: unknown): GenericRecord[] {
  if (!Array.isArray(value)) {
    return []
  }
  const seen = new Set<string>()
  return value
    .filter((item): item is GenericRecord => !!item && typeof item === 'object')
    .map((item) => {
      const source = asRecord(item.shop_base_info)
      const merged = Object.keys(source).length > 0 ? { ...item, ...source } : item
      return compactShopItem({
        merchant_id: firstText(merged.merchant_id, merged.seller_id),
        seller_id: firstText(merged.seller_id, merged.merchant_id),
        shop_id: firstText(merged.shop_id, merged.id),
        shop_cipher: firstText(merged.shop_cipher, merged.third_shop_id),
        third_shop_id: firstText(merged.third_shop_id, merged.shop_cipher),
        shop_name: firstText(merged.shop_name, merged.shopName, merged.name),
        shop_region: firstText(merged.shop_region, merged.shopRegion, merged.region, merged.country_code),
      })
    })
    .filter((item) => Object.keys(item).length > 0)
    .filter((item) => {
      const key = safeJSONStringify(item)
      if (!key || seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
    .slice(0, MAX_JSON_ITEMS)
}

function compactShopItem(item: GenericRecord) {
  const out: GenericRecord = {}
  for (const [key, value] of Object.entries(item)) {
    const text = asText(value)
    if (text) {
      out[key] = text
    }
  }
  return out
}

function filterStorageEntries(storage: Record<string, string>) {
  return Object.entries(storage)
    .filter(([, value]) => value && value !== '[FILTERED]')
    .slice(0, 50)
}

function normalizeSameSite(value: unknown): 'Strict' | 'Lax' | 'None' | undefined {
  const current = asText(value).toLowerCase()
  if (current === 'strict') {
    return 'Strict'
  }
  if (current === 'lax') {
    return 'Lax'
  }
  if (current === 'none' || current === 'no_restriction') {
    return 'None'
  }
  return undefined
}

function resolvePositiveInt(value: unknown, fallback: number) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function parseBoolean(value: unknown, fallback: boolean) {
  const current = asText(value).toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(current)) {
    return true
  }
  if (['0', 'false', 'no', 'off'].includes(current)) {
    return false
  }
  return fallback
}

function emptyTikTokResult(): TikTokBrowserMetadataResult {
  return {
    status: 'empty',
    merchant_id: '',
    seller_id: '',
    shop_id: '',
    shop_cipher: '',
    third_shop_id: '',
    shop_name: '',
    shop_region: '',
    browser_session_ref: '',
    source_url: '',
    available_shops: [],
    inspected_urls: [],
    errors: [],
    harvest_mode: 'empty',
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
