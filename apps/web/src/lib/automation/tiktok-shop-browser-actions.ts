import { assertSafeTikTokURL, createTikTokBrowserConnection, type GenericRecord, loadTikTokSessionData } from './tiktok-shop-browser'

type BrowserStep = {
  action?: string
  url?: string
  selector?: string
  value?: string
  key?: string
  text?: string
  timeout_ms?: number
  wait_until?: 'load' | 'domcontentloaded' | 'networkidle'
}

type TikTokCatalogProduct = {
  id: string
  sku: string
  name: string
  description: string
  price: string
  image_url: string
}

export type TikTokCatalogBrowserRequest = {
  browser_session_ref?: string
  target_url?: string
  candidate_urls?: unknown
  browser_recipe?: GenericRecord
  request_payload?: GenericRecord
  merchant_id?: string
  shop_id?: string
  catalog?: GenericRecord
}

export type TikTokCatalogBrowserResult = {
  status: 'completed' | 'partial' | 'empty' | 'failed'
  uploaded_count: number
  failed_count: number
  browser_session_ref: string
  inspected_urls: string[]
  errors: string[]
  items: Array<Record<string, unknown>>
}

export type TikTokCommunityReplyBrowserRequest = {
  browser_session_ref?: string
  target_url?: string
  candidate_urls?: unknown
  browser_recipe?: GenericRecord
  request_payload?: GenericRecord
  reply_text?: string
  comment_id?: string
  conversation_key?: string
  post_id?: string
  author_handle?: string
}

export type TikTokCommunityReplyBrowserResult = {
  status: 'completed' | 'empty' | 'failed'
  dispatched: boolean
  browser_session_ref: string
  inspected_urls: string[]
  errors: string[]
  provider_result: Record<string, unknown>
}

const DEFAULT_CATALOG_URLS = [
  'https://seller.tiktokglobalshop.com/homepage',
  'https://seller.tiktokglobalshop.com/products',
  'https://seller.tiktokglobalshop.com/product/create',
]

const DEFAULT_REPLY_URLS = [
  'https://seller.tiktokglobalshop.com/message',
  'https://seller.tiktokglobalshop.com/im',
  'https://seller.tiktokglobalshop.com/comments',
  'https://seller.tiktokglobalshop.com/homepage',
]

const STEP_TIMEOUT_MS = 12_000
const PRODUCT_LIMIT = 12

export async function syncTikTokCatalogViaBrowser(request: TikTokCatalogBrowserRequest): Promise<TikTokCatalogBrowserResult> {
  const sessionState = await loadTikTokSessionData(asText(request.browser_session_ref))
  const browser = await createTikTokBrowserConnection()
  if (!browser) {
    throw new Error('tiktok_browser_runner_unavailable')
  }

  const products = normalizeCatalogProducts(request)
  if (products.length === 0) {
    await browser.close()
    return {
      status: 'empty',
      uploaded_count: 0,
      failed_count: 0,
      browser_session_ref: firstText(request.browser_session_ref, sessionState.session?.sessionId),
      inspected_urls: [],
      errors: [],
      items: [],
    }
  }

  const candidateUrls = await normalizeActionURLs([
    request.target_url,
    request.candidate_urls,
    request.request_payload?.target_url,
    request.request_payload?.product_upload_url,
    request.request_payload?.seller_center_url,
    request.request_payload?.current_url,
    ...DEFAULT_CATALOG_URLS,
  ])

  const context = await browser.prepareContext(sessionState.session)
  const page = await context.newPage()
  const errors: string[] = []
  const items: Array<Record<string, unknown>> = []
  let finalURL = ''

  try {
    if (candidateUrls.length > 0) {
      await page.goto(candidateUrls[0], {
        waitUntil: resolveWaitUntil(request.browser_recipe?.wait_until),
        timeout: resolvePositiveInt(request.browser_recipe?.navigation_timeout_ms, STEP_TIMEOUT_MS),
      })
      await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined)
    }

    for (const product of products) {
      try {
        if (recipeSteps(request.browser_recipe, 'catalog_product_steps').length > 0) {
          await runRecipeSteps(page, recipeSteps(request.browser_recipe, 'catalog_product_steps'), product)
        } else {
          await openCatalogCreateSurface(page)
          await fillCatalogProductForm(page, product)
          await submitCatalogProduct(page)
        }
        finalURL = page.url()

        items.push({
          product_id: product.id,
          sku: product.sku,
          status: 'submitted',
          current_url: finalURL,
        })
      } catch (error) {
        finalURL = page.url()
        errors.push(`${product.id || product.name}: ${error instanceof Error ? error.message : String(error)}`)
        items.push({
          product_id: product.id,
          sku: product.sku,
          status: 'failed',
          current_url: finalURL,
        })
      }
    }
  } finally {
    await page.close().catch(() => undefined)
    await browser.close()
  }

  const uploadedCount = items.filter((item) => String(item.status) === 'submitted').length
  const failedCount = items.length - uploadedCount
  return {
    status: uploadedCount === 0 ? (failedCount > 0 ? 'failed' : 'empty') : failedCount > 0 ? 'partial' : 'completed',
    uploaded_count: uploadedCount,
    failed_count: failedCount,
    browser_session_ref: firstText(request.browser_session_ref, sessionState.session?.sessionId),
    inspected_urls: normalizeUniqueStrings(candidateUrls, finalURL),
    errors,
    items,
  }
}

export async function dispatchTikTokCommunityReplyViaBrowser(request: TikTokCommunityReplyBrowserRequest): Promise<TikTokCommunityReplyBrowserResult> {
  const replyText = asText(request.reply_text)
  if (!replyText) {
    return {
      status: 'empty',
      dispatched: false,
      browser_session_ref: asText(request.browser_session_ref),
      inspected_urls: [],
      errors: ['reply_text_missing'],
      provider_result: {},
    }
  }

  const sessionState = await loadTikTokSessionData(asText(request.browser_session_ref))
  const browser = await createTikTokBrowserConnection()
  if (!browser) {
    throw new Error('tiktok_browser_runner_unavailable')
  }

  const candidateUrls = await normalizeActionURLs([
    request.target_url,
    request.candidate_urls,
    request.request_payload?.target_url,
    request.request_payload?.reply_url,
    request.request_payload?.comment_url,
    request.request_payload?.message_url,
    request.request_payload?.source_url,
    ...DEFAULT_REPLY_URLS,
  ])

  const context = await browser.prepareContext(sessionState.session)
  const page = await context.newPage()
  const errors: string[] = []

  try {
    for (const candidateUrl of candidateUrls) {
      try {
        await page.goto(candidateUrl, {
          waitUntil: resolveWaitUntil(request.browser_recipe?.wait_until),
          timeout: resolvePositiveInt(request.browser_recipe?.navigation_timeout_ms, STEP_TIMEOUT_MS),
        })
        await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined)

        if (recipeSteps(request.browser_recipe, 'reply_steps').length > 0) {
          await runRecipeSteps(page, recipeSteps(request.browser_recipe, 'reply_steps'), {
            reply_text: replyText,
            comment_id: asText(request.comment_id),
            conversation_key: asText(request.conversation_key),
            post_id: asText(request.post_id),
            author_handle: asText(request.author_handle),
          })
        } else {
          await fillReplyComposer(page, replyText)
          await submitReply(page)
        }

        return {
          status: 'completed',
          dispatched: true,
          browser_session_ref: firstText(request.browser_session_ref, sessionState.session?.sessionId),
          inspected_urls: normalizeUniqueStrings(candidateUrls, candidateUrl, page.url()),
          errors,
          provider_result: {
            current_url: page.url(),
            dispatch_mode: 'browser_runner',
          },
        }
      } catch (error) {
        errors.push(`${candidateUrl}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  } finally {
    await page.close().catch(() => undefined)
    await browser.close()
  }

  return {
    status: 'failed',
    dispatched: false,
    browser_session_ref: firstText(request.browser_session_ref, sessionState.session?.sessionId),
    inspected_urls: candidateUrls,
    errors,
    provider_result: {},
  }
}

async function openCatalogCreateSurface(page: import('playwright-core').Page) {
  await clickFirstVisible(page, [
    'button:has-text("Add product")',
    'button:has-text("Create product")',
    'button:has-text("Add Product")',
    'button:has-text("New product")',
    'a:has-text("Add product")',
    'a:has-text("Create product")',
  ]).catch(() => undefined)
  await page.waitForLoadState('domcontentloaded', { timeout: 5_000 }).catch(() => undefined)
}

async function fillCatalogProductForm(page: import('playwright-core').Page, product: TikTokCatalogProduct) {
  await fillFirstInput(page, [
    'input[name*="name"]',
    'input[name*="title"]',
    'textarea[name*="name"]',
    '[placeholder*="Product name"]',
    '[placeholder*="Title"]',
    '[aria-label*="Product name"]',
  ], product.name)

  await fillFirstInput(page, [
    'textarea[name*="description"]',
    '[placeholder*="Description"]',
    '[aria-label*="Description"]',
    'div[role="textbox"]',
    '[contenteditable="true"]',
  ], product.description)

  await fillFirstInput(page, [
    'input[name*="price"]',
    '[placeholder*="Price"]',
    '[aria-label*="Price"]',
  ], product.price)

  if (product.sku) {
    await fillFirstInput(page, [
      'input[name*="sku"]',
      '[placeholder*="SKU"]',
      '[aria-label*="SKU"]',
    ], product.sku).catch(() => undefined)
  }
}

async function submitCatalogProduct(page: import('playwright-core').Page) {
  await clickFirstVisible(page, [
    'button:has-text("Submit")',
    'button:has-text("Publish")',
    'button:has-text("Save")',
    'button:has-text("Create")',
    'button:has-text("Next")',
  ])
  await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined)
}

async function fillReplyComposer(page: import('playwright-core').Page, replyText: string) {
  await fillFirstInput(page, [
    'textarea',
    'div[role="textbox"]',
    '[contenteditable="true"]',
    '[placeholder*="Reply"]',
    '[placeholder*="Message"]',
    '[aria-label*="Reply"]',
  ], replyText)
}

async function submitReply(page: import('playwright-core').Page) {
  await clickFirstVisible(page, [
    'button:has-text("Reply")',
    'button:has-text("Send")',
    'button:has-text("Post")',
    '[aria-label*="Reply"]',
    '[aria-label*="Send"]',
  ])
  await page.waitForTimeout(1200)
}

async function runRecipeSteps(page: import('playwright-core').Page, steps: BrowserStep[], data: Record<string, unknown>) {
  for (const step of steps) {
    const action = asText(step.action).toLowerCase()
    const timeout = resolvePositiveInt(step.timeout_ms, STEP_TIMEOUT_MS)
    if (action === 'goto') {
      const url = templateText(firstText(step.url, step.value), data)
      if (!url) {
        continue
      }
      const safeURL = await assertSafeTikTokURL(url)
      await page.goto(safeURL.toString(), {
        waitUntil: resolveWaitUntil(step.wait_until),
        timeout,
      })
      continue
    }
    if (action === 'wait') {
      await page.waitForTimeout(resolvePositiveInt(step.value || step.text || step.timeout_ms, 800))
      continue
    }
    if (action === 'wait_for_selector') {
      if (step.selector) {
        await page.waitForSelector(step.selector, { timeout })
      }
      continue
    }
    if (action === 'click') {
      const selector = templateText(firstText(step.selector), data)
      if (!selector) {
        continue
      }
      await page.locator(selector).first().click({ timeout })
      continue
    }
    if (action === 'fill') {
      const selector = templateText(firstText(step.selector), data)
      const value = templateText(firstText(step.value, step.text), data)
      if (!selector) {
        continue
      }
      await fillLocator(page, selector, value, timeout)
      continue
    }
    if (action === 'press') {
      const selector = templateText(firstText(step.selector), data)
      const key = templateText(step.key || step.value || 'Enter', data)
      if (!selector) {
        continue
      }
      await page.locator(selector).first().press(key, { timeout })
      continue
    }
  }
}

async function clickFirstVisible(page: import('playwright-core').Page, selectors: string[]) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first()
    try {
      if (await locator.isVisible({ timeout: 1500 })) {
        await locator.click({ timeout: STEP_TIMEOUT_MS })
        return
      }
    } catch {}
  }
  throw new Error('matching_click_target_not_found')
}

async function fillFirstInput(page: import('playwright-core').Page, selectors: string[], value: string) {
  const text = asText(value)
  if (!text) {
    return
  }
  for (const selector of selectors) {
    try {
      await fillLocator(page, selector, text, 2500)
      return
    } catch {}
  }
  throw new Error(`input_target_not_found:${selectors[0] || 'unknown'}`)
}

async function fillLocator(page: import('playwright-core').Page, selector: string, value: string, timeout: number) {
  const locator = page.locator(selector).first()
  await locator.waitFor({ state: 'visible', timeout })
  const element = await locator.elementHandle()
  if (!element) {
    throw new Error(`locator_not_found:${selector}`)
  }
  const tagName = await element.evaluate((node) => node.tagName.toLowerCase())
  const isContentEditable = await element.evaluate((node) => (node as HTMLElement).isContentEditable)
  if (tagName === 'input' || tagName === 'textarea') {
    await locator.fill(value, { timeout })
    return
  }
  if (isContentEditable) {
    await locator.click({ timeout })
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A')
    await page.keyboard.type(value, { delay: 10 })
    return
  }
  throw new Error(`unsupported_fill_target:${selector}`)
}

async function normalizeActionURLs(values: unknown[]): Promise<string[]> {
  const out: string[] = []
  const candidates = values.flatMap((value) => (Array.isArray(value) ? value : [value]))
  for (const candidate of candidates) {
    const current = asText(candidate)
    if (!current || out.includes(current)) {
      continue
    }
    try {
      const safeURL = await assertSafeTikTokURL(current)
      out.push(safeURL.toString())
    } catch {}
  }
  return out
}

function normalizeCatalogProducts(request: TikTokCatalogBrowserRequest): TikTokCatalogProduct[] {
  const raw = firstObjectArray(
    request.catalog?.products,
    request.request_payload?.products,
    request.request_payload?.catalog_products,
  )

  return raw.slice(0, PRODUCT_LIMIT).map((item, index) => ({
    id: firstText(item.id, item.product_id, `product-${index + 1}`),
    sku: firstText(item.sku, item.supplier_sku),
    name: firstText(item.name, item.title, item.product_name),
    description: firstText(item.description, item.body_html),
    price: normalizePrice(firstText(item.price, item.sale_price, item.retail_price)),
    image_url: firstText(item.image_url, item.featured_image, item.images),
  })).filter((item) => item.name !== '')
}

function recipeSteps(recipe: unknown, key: string): BrowserStep[] {
  const current = recipe && typeof recipe === 'object' ? (recipe as GenericRecord)[key] : undefined
  if (!Array.isArray(current)) {
    return []
  }
  return current.filter((step): step is BrowserStep => !!step && typeof step === 'object')
}

function firstObjectArray(...values: unknown[]): GenericRecord[] {
  for (const value of values) {
    if (Array.isArray(value)) {
      return value.filter((item): item is GenericRecord => !!item && typeof item === 'object')
    }
  }
  return []
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

function asText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function templateText(input: string, data: Record<string, unknown>) {
  return input.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => firstText(data[key]))
}

function normalizeUniqueStrings(...values: unknown[]) {
  const out: string[] = []
  for (const value of values.flatMap((item) => (Array.isArray(item) ? item : [item]))) {
    const text = asText(value)
    if (text && !out.includes(text)) {
      out.push(text)
    }
  }
  return out
}

function resolvePositiveInt(value: unknown, fallback: number) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function resolveWaitUntil(value: unknown): 'load' | 'domcontentloaded' | 'networkidle' {
  const current = asText(value).toLowerCase()
  if (current === 'load' || current === 'networkidle') {
    return current
  }
  return 'domcontentloaded'
}

function normalizePrice(value: string) {
  return value.replace(/[^\d.,-]/g, '').replace(',', '.')
}
