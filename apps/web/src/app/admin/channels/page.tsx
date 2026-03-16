'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from '@/components/ui/Link'
import { useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  MessageSquareText,
  RefreshCw,
  Send,
  ShoppingBag,
  Store,
  Workflow,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { getAuthHeaders } from '@/lib/api/auth'

type GenericRecord = Record<string, unknown>

type Flash = {
  tone: 'success' | 'error'
  message: string
}

type ConnectFormState = {
  stateToken: string
  accountExternalId: string
  accessToken: string
  refreshToken: string
  merchantId: string
  sellerId: string
  shopId: string
  shopCipher: string
  shopRegion: string
  productSaveEndpoint: string
  campaignPublishEndpoint: string
  browserSessionRef: string
  registrationTargetUrl: string
  registrationGuideUrl: string
  browserCatalogTargetUrl: string
  browserReplyTargetUrl: string
  catalogBrowserRecipe: string
  communityReplyBrowserRecipe: string
}

const DEFAULT_CONNECT_STEPS = [
  'SIN-TikTok für Creator-Identität und Posting-Freigaben verbinden oder prüfen.',
  'SIN-TikTok-Shop für Seller-/Partner-Center-Status und Shop-Metadaten nutzen.',
  'Danach Katalog spiegeln und erst dann die Content-Pipeline aktivieren.',
]

const EMPTY_FORM: ConnectFormState = {
  stateToken: '',
  accountExternalId: '',
  accessToken: '',
  refreshToken: '',
  merchantId: '',
  sellerId: '',
  shopId: '',
  shopCipher: '',
  shopRegion: 'DE',
  productSaveEndpoint: '',
  campaignPublishEndpoint: '',
  browserSessionRef: '',
  registrationTargetUrl: '',
  registrationGuideUrl: '',
  browserCatalogTargetUrl: '',
  browserReplyTargetUrl: '',
  catalogBrowserRecipe: '',
  communityReplyBrowserRecipe: '',
}

function asText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function asItems(value: unknown) {
  return Array.isArray(value) ? (value.filter((item): item is GenericRecord => !!item && typeof item === 'object') as GenericRecord[]) : []
}

function pickText(...values: unknown[]) {
  for (const value of values) {
    const text = asText(value)
    if (text) {
      return text
    }
  }
  return ''
}

function uniqueTexts(...values: unknown[]) {
  const out: string[] = []
  for (const value of values.flatMap((item) => (Array.isArray(item) ? item : [item]))) {
    const text = asText(value)
    if (text && !out.includes(text)) {
      out.push(text)
    }
  }
  return out
}

function formatJSONText(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return ''
  }
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return ''
  }
}

function parseJSONObjectText(label: string, raw: string) {
  const value = raw.trim()
  if (!value) {
    return {}
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error(`${label} muss gültiges JSON sein.`)
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label} muss ein JSON-Objekt sein.`)
  }
  return parsed as GenericRecord
}

function deriveTikTokConnectPrefill(payload: GenericRecord | null | undefined): Partial<ConnectFormState> {
  if (!payload) {
    return {}
  }
  const callbackPayload = ((payload.callback_payload as GenericRecord | undefined) || {}) as GenericRecord
  const oauthPayload = ((callbackPayload.tiktok_oauth as GenericRecord | undefined) || {}) as GenericRecord
  const connectContext = ((callbackPayload.tiktok_connect_context as GenericRecord | undefined) || {}) as GenericRecord
  const shopLookup = ((callbackPayload.tiktok_shop_lookup as GenericRecord | undefined) || {}) as GenericRecord
  const primaryShop = asItems(shopLookup.available_shops)[0] || {}
  const merchantId = pickText(connectContext.merchant_id, oauthPayload.merchant_id, shopLookup.merchant_id, primaryShop.merchant_id)
  const sellerId = pickText(connectContext.seller_id, oauthPayload.seller_id, shopLookup.seller_id, primaryShop.seller_id, merchantId)
  const shopId = pickText(connectContext.shop_id, oauthPayload.shop_id, shopLookup.shop_id, primaryShop.shop_id)
  const shopCipher = pickText(
    connectContext.shop_cipher,
    connectContext.third_shop_id,
    oauthPayload.shop_cipher,
    oauthPayload.third_shop_id,
    shopLookup.shop_cipher,
    shopLookup.third_shop_id,
    primaryShop.shop_cipher,
    primaryShop.third_shop_id,
  )
  const shopRegion = pickText(connectContext.shop_region, oauthPayload.shop_region, shopLookup.shop_region, primaryShop.shop_region)

  return {
    stateToken: pickText(payload.state_token),
    accessToken: pickText(oauthPayload.access_token),
    refreshToken: pickText(oauthPayload.refresh_token),
    merchantId,
    sellerId,
    shopId,
    shopCipher,
    shopRegion,
    accountExternalId: pickText(connectContext.account_external_id, shopId, shopCipher, sellerId, merchantId),
  }
}

function badgeVariantForStatus(status: string) {
  switch (status) {
    case 'connected':
    case 'healthy':
    case 'succeeded':
    case 'done':
      return 'success' as const
    case 'degraded':
    case 'running':
    case 'in_progress':
    case 'medium':
      return 'warning' as const
    case 'high':
      return 'warning' as const
    case 'urgent':
    case 'failed':
    case 'error':
    case 'blocked':
      return 'danger' as const
    case 'low':
    case 'info':
      return 'secondary' as const
    default:
      return 'outline' as const
  }
}

function formatStatus(status: string) {
  if (!status) return 'Unbekannt'
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatDate(value: unknown) {
  const raw = asText(value)
  if (!raw) return '—'
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function numberValue(value: unknown) {
  return typeof value === 'number' ? value : Number(value || 0)
}

function AdminChannelsPageContent() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState<Flash | null>(null)
  const [reloadSeed, setReloadSeed] = useState(0)
  const [channels, setChannels] = useState<GenericRecord[]>([])
  const [health, setHealth] = useState<GenericRecord>({})
  const [queue, setQueue] = useState<GenericRecord>({})
  const [connectMeta, setConnectMeta] = useState<GenericRecord | null>(null)
  const [registrationResult, setRegistrationResult] = useState<GenericRecord | null>(null)
  const [connectForm, setConnectForm] = useState<ConnectFormState>(EMPTY_FORM)
  const [startingConnect, setStartingConnect] = useState(false)
  const [startingRegistration, setStartingRegistration] = useState(false)
  const [requestingBrowserMetadata, setRequestingBrowserMetadata] = useState(false)
  const [completingConnect, setCompletingConnect] = useState(false)
  const [refreshingMetadata, setRefreshingMetadata] = useState(false)
  const [syncingCatalog, setSyncingCatalog] = useState(false)
  const [startingContent, setStartingContent] = useState(false)
  const [patchingTaskId, setPatchingTaskId] = useState<string | null>(null)
  const [draftingTaskId, setDraftingTaskId] = useState<string | null>(null)
  const [sendingTaskId, setSendingTaskId] = useState<string | null>(null)
  const [draftsByTask, setDraftsByTask] = useState<Record<string, string>>({})

  const stateFromQuery = searchParams.get('state')?.trim() || ''
  const channelFromQuery = searchParams.get('channel')?.trim() || ''
  const oauthStatusFromQuery = searchParams.get('oauth_status')?.trim() || ''

  useEffect(() => {
    if (!stateFromQuery) {
      return
    }
    setConnectForm((current) => (current.stateToken === stateFromQuery ? current : { ...current, stateToken: stateFromQuery }))
  }, [stateFromQuery])

  useEffect(() => {
    let active = true

    const run = async () => {
      if (!stateFromQuery) {
        return
      }
      try {
        const response = await fetch(`/api/admin/channels/tiktok/connect/sessions/${encodeURIComponent(stateFromQuery)}`, {
          cache: 'no-store',
          headers: await getAuthHeaders(),
        })
        if (!response.ok) {
          return
        }
        const payload = (await response.json()) as GenericRecord
        if (!active) return

        const callbackPayload = ((payload.callback_payload as GenericRecord | undefined) || {}) as GenericRecord
        const oauthPayload = ((callbackPayload.tiktok_oauth as GenericRecord | undefined) || {}) as GenericRecord
        const oauthAccessToken = asText(oauthPayload.access_token)
        const oauthRefreshToken = asText(oauthPayload.refresh_token)
        const sessionPrefill = deriveTikTokConnectPrefill(payload)
        setConnectMeta((current) => ({ ...(current || {}), ...payload }))
        setConnectForm((current) => ({
          ...current,
          stateToken: stateFromQuery,
          accessToken: sessionPrefill.accessToken || oauthAccessToken || current.accessToken,
          refreshToken: sessionPrefill.refreshToken || oauthRefreshToken || current.refreshToken,
          merchantId: sessionPrefill.merchantId || current.merchantId,
          sellerId: sessionPrefill.sellerId || current.sellerId,
          shopId: sessionPrefill.shopId || current.shopId,
          shopCipher: sessionPrefill.shopCipher || current.shopCipher,
          shopRegion: sessionPrefill.shopRegion || current.shopRegion,
          accountExternalId: sessionPrefill.accountExternalId || current.accountExternalId,
        }))

        if (oauthStatusFromQuery === 'received' && oauthAccessToken) {
          setFlash({
            tone: 'success',
            message:
              sessionPrefill.merchantId || sessionPrefill.shopId || sessionPrefill.shopCipher
                ? 'TikTok OAuth und verfügbare Shop-Daten wurden serverseitig übernommen. Jetzt nur noch prüfen und speichern.'
                : 'TikTok OAuth-Code wurde serverseitig in ein Token getauscht. Merchant- und Shop-Daten werden automatisch genutzt, sobald TikTok sie mitsendet oder lookupbar macht.',
          })
        }
        if (oauthStatusFromQuery === 'error') {
          setFlash({
            tone: 'error',
            message: asText(oauthPayload.error_description) || asText(oauthPayload.error) || 'TikTok OAuth Callback fehlgeschlagen.',
          })
        }
      } catch {
        if (!active) return
      }
    }

    void run()
    return () => {
      active = false
    }
  }, [oauthStatusFromQuery, reloadSeed, stateFromQuery])

  useEffect(() => {
    let active = true

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const headers = await getAuthHeaders()
        const [channelsRes, healthRes, queueRes] = await Promise.all([
          fetch('/api/admin/channels', { cache: 'no-store', headers }),
          fetch('/api/admin/channels/tiktok/health', { cache: 'no-store', headers }),
          fetch('/api/admin/channels/tiktok/community/queue?limit=8', { cache: 'no-store', headers }),
        ])

        if (!channelsRes.ok) {
          throw new Error(`channels_load_failed:${channelsRes.status}`)
        }

        const channelsPayload = (await channelsRes.json()) as { items?: GenericRecord[] }
        const healthPayload = healthRes.ok ? ((await healthRes.json()) as GenericRecord) : {}
        const queuePayload = queueRes.ok ? ((await queueRes.json()) as GenericRecord) : {}

        if (!active) return
        setChannels(asItems(channelsPayload.items))
        setHealth(healthPayload || {})
        setQueue(queuePayload || {})
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'channels_load_failed')
        setChannels([])
        setHealth({})
        setQueue({})
      } finally {
        if (active) setLoading(false)
      }
    }

    void run()
    return () => {
      active = false
    }
  }, [reloadSeed])

  useEffect(() => {
    if (!health || Object.keys(health).length === 0) {
      return
    }
    setConnectForm((current) => ({
      ...current,
      productSaveEndpoint: current.productSaveEndpoint || asText(health.catalog_endpoint),
      campaignPublishEndpoint: current.campaignPublishEndpoint || asText(health.campaign_endpoint),
      browserSessionRef: current.browserSessionRef || asText(health.browser_session_ref),
      browserCatalogTargetUrl: current.browserCatalogTargetUrl || asText(health.browser_catalog_target_url),
      browserReplyTargetUrl: current.browserReplyTargetUrl || asText(health.browser_reply_target_url),
      catalogBrowserRecipe: current.catalogBrowserRecipe || formatJSONText(health.catalog_browser_recipe),
      communityReplyBrowserRecipe: current.communityReplyBrowserRecipe || formatJSONText(health.community_reply_browser_recipe),
    }))
  }, [health])

  const tiktokAccount = useMemo(() => {
    return (
      channels.find((item) => asText(item.channel) === 'tiktok') || {
        channel: 'tiktok',
        account_name: 'tiktok-shop',
        status: 'disconnected',
        connection_mode: 'browser_oauth',
      }
    )
  }, [channels])

  const summary = useMemo(() => {
    const data = (queue.summary as GenericRecord | undefined) || {}
    return {
      openCount: numberValue(data.open_count),
      inProgressCount: numberValue(data.in_progress_count),
      urgentCount: numberValue(data.urgent_count),
      events24h: numberValue(data.events_24h),
      projectionErrors: numberValue(data.projection_errors),
    }
  }, [queue])

  const openTasks = useMemo(() => asItems(queue.open_tasks), [queue])
  const recentEvents = useMemo(() => asItems(queue.recent_events), [queue])
  const recentActivities = useMemo(() => asItems(queue.recent_activities), [queue])
  const recentNotes = useMemo(() => asItems(queue.recent_notes), [queue])
  const requiredSteps = useMemo(() => {
    const steps = connectMeta?.required_steps
    return Array.isArray(steps) && steps.length > 0 ? steps.map((step) => String(step)) : DEFAULT_CONNECT_STEPS
  }, [connectMeta])

  const connectURL = asText(connectMeta?.connect_url)
  const connected = asText(health.status) === 'connected'
  const healthCatalogEndpoint = asText(health.catalog_endpoint)
  const healthCampaignEndpoint = asText(health.campaign_endpoint)
  const a2aCreator = ((health.a2a_creator as GenericRecord | undefined) || {}) as GenericRecord
  const a2aShop = ((health.a2a_shop as GenericRecord | undefined) || {}) as GenericRecord
  const a2aCreatorSession = ((health.a2a_creator_session as GenericRecord | undefined) || {}) as GenericRecord
  const a2aShopSession = ((health.a2a_shop_session as GenericRecord | undefined) || {}) as GenericRecord
  const a2aShopOnboarding = ((health.a2a_shop_onboarding as GenericRecord | undefined) || {}) as GenericRecord
  const creatorGuideURL = pickText(connectMeta?.creator_guide_url, health.creator_guide_url)
  const shopGuideURL = pickText(connectMeta?.shop_guide_url, health.shop_guide_url)
  const shopTeamGuideURL = pickText(connectMeta?.shop_team_guide_url, health.shop_team_guide_url)
  const shopReferenceTabURL = pickText(connectMeta?.shop_reference_tab_url, health.shop_reference_tab_url)
  const browserSessionReady = pickText(connectForm.browserSessionRef, health.browser_session_ref)
  const browserCatalogTargetReady = pickText(connectForm.browserCatalogTargetUrl, health.browser_catalog_target_url)
  const browserReplyTargetReady = pickText(connectForm.browserReplyTargetUrl, health.browser_reply_target_url)
  const browserCatalogConfigured = Boolean(browserSessionReady || browserCatalogTargetReady || formatJSONText(health.catalog_browser_recipe) || connectForm.catalogBrowserRecipe.trim())
  const browserReplyConfigured = Boolean(browserSessionReady || browserReplyTargetReady || formatJSONText(health.community_reply_browser_recipe) || connectForm.communityReplyBrowserRecipe.trim())

  const refresh = () => {
    setReloadSeed((current) => current + 1)
  }

  const updateForm = (key: keyof ConnectFormState, value: string) => {
    setConnectForm((current) => ({ ...current, [key]: value }))
  }

  const startConnect = async () => {
    setStartingConnect(true)
    setFlash(null)
    try {
      const response = await fetch('/api/admin/channels/tiktok/connect/start', {
        method: 'POST',
        cache: 'no-store',
        headers: await getAuthHeaders(),
      })
      if (!response.ok) {
        throw new Error(`tiktok_connect_start_failed:${response.status}`)
      }
      const payload = (await response.json()) as GenericRecord
      setConnectMeta(payload)
      setConnectForm((current) => ({
        ...current,
        stateToken: asText(payload.state_token) || current.stateToken,
      }))
      if (asText(payload.connect_url)) {
        window.open(asText(payload.connect_url), '_blank', 'noopener,noreferrer')
      }
      setFlash({
        tone: 'success',
        message: asText(payload.connect_url)
          ? 'TikTok A2A-Connect initialisiert. Den neuen Tab freigeben und danach den Shop-Kontext hier prüfen.'
          : 'TikTok A2A-Status aktualisiert. Wenn noch kein Browser-Connect möglich ist, zuerst die Guide-Links von SIN-TikTok und SIN-TikTok-Shop öffnen.',
      })
    } catch (actionError) {
      setFlash({
        tone: 'error',
        message: actionError instanceof Error ? actionError.message : 'tiktok_connect_start_failed',
      })
    } finally {
      setStartingConnect(false)
    }
  }

  const startRegistration = async () => {
    setStartingRegistration(true)
    setFlash(null)
    try {
      const response = await fetch('/api/admin/channels/tiktok/registration/start', {
        method: 'POST',
        cache: 'no-store',
        headers: await getAuthHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify({
          target_url: connectForm.registrationTargetUrl.trim(),
          candidate_urls: uniqueTexts(connectForm.registrationTargetUrl),
          google_doc_url: connectForm.registrationGuideUrl.trim(),
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as GenericRecord
      if (!response.ok) {
        throw new Error(asText(payload.error) || `tiktok_registration_start_failed:${response.status}`)
      }

      setRegistrationResult(payload)
      if (asText(payload.registration_url)) {
        setConnectForm((current) => ({
          ...current,
          registrationTargetUrl: asText(payload.registration_url) || current.registrationTargetUrl,
        }))
      }

      const guideStatus = asText(payload.guide_status)
      const ignoredCount = Array.isArray(payload.ignored_urls) ? payload.ignored_urls.length : 0
      setFlash({
        tone: guideStatus === 'error' ? 'error' : 'success',
        message:
          guideStatus === 'ready'
            ? ignoredCount > 0
              ? 'TikTok-Seller-Registrierung wurde im Standardbrowser geöffnet. Nicht-deutsche oder ungültige URLs wurden serverseitig verworfen.'
              : 'TikTok-Seller-Registrierung wurde im Standardbrowser geöffnet. Das Google-Dokument konnte gelesen werden und die Pflichtschritte sind unten sichtbar.'
            : guideStatus === 'blocked'
              ? ignoredCount > 0
                ? 'TikTok-Seller-Registrierung wurde im Standardbrowser geöffnet. Nicht-deutsche oder ungültige URLs wurden verworfen; der Google-Doc-Import blieb ohne Service-Account blockiert.'
                : 'TikTok-Seller-Registrierung wurde im Standardbrowser geöffnet. Das Google-Dokument blieb ohne hinterlegten Google-Service-Account blockiert.'
              : ignoredCount > 0
                ? 'TikTok-Seller-Registrierung wurde im Standardbrowser geöffnet. Nicht-deutsche oder ungültige URLs wurden serverseitig verworfen.'
                : 'TikTok-Seller-Registrierung wurde im Standardbrowser geöffnet. Nach E-Mail-Verifizierung hier direkt mit Browser-Connect weitermachen.',
      })
    } catch (actionError) {
      setFlash({
        tone: 'error',
        message: actionError instanceof Error ? actionError.message : 'tiktok_registration_start_failed',
      })
    } finally {
      setStartingRegistration(false)
    }
  }

  const completeConnect = async () => {
    if (!connectForm.stateToken.trim()) {
      setFlash({ tone: 'error', message: 'State-Token fehlt.' })
      return
    }

    setCompletingConnect(true)
    setFlash(null)
    try {
      const sessionPrefill = deriveTikTokConnectPrefill(connectMeta)
      const catalogBrowserRecipe = parseJSONObjectText('Catalog Browser Recipe', connectForm.catalogBrowserRecipe)
      const communityReplyBrowserRecipe = parseJSONObjectText('Community Reply Recipe', connectForm.communityReplyBrowserRecipe)
      const accessToken = connectForm.accessToken.trim() || sessionPrefill.accessToken || ''
      const refreshToken = connectForm.refreshToken.trim() || sessionPrefill.refreshToken || ''
      const merchantId = connectForm.merchantId.trim() || sessionPrefill.merchantId || ''
      const sellerId = connectForm.sellerId.trim() || sessionPrefill.sellerId || merchantId
      const shopId = connectForm.shopId.trim() || sessionPrefill.shopId || ''
      const shopCipher = connectForm.shopCipher.trim() || sessionPrefill.shopCipher || ''
      const shopRegion = connectForm.shopRegion.trim() || sessionPrefill.shopRegion || 'DE'
      const accountExternalId = connectForm.accountExternalId.trim() || sessionPrefill.accountExternalId || shopId || shopCipher || sellerId || merchantId

      const response = await fetch('/api/admin/channels/tiktok/connect/complete', {
        method: 'POST',
        cache: 'no-store',
        headers: await getAuthHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify({
          state_token: connectForm.stateToken.trim(),
          account_external_id: accountExternalId,
          auth_snapshot: {
            account_name: 'tiktok-shop',
            access_token: accessToken,
            oauth_access_token: accessToken,
            tiktok_oauth_access_token: accessToken,
            refresh_token: refreshToken,
            merchant_id: merchantId,
            seller_id: sellerId,
            shop_id: shopId,
            shop_cipher: shopCipher,
            shop_region: shopRegion,
            product_save_endpoint: connectForm.productSaveEndpoint.trim(),
            catalog_sync_endpoint: connectForm.productSaveEndpoint.trim(),
            campaign_publish_endpoint: connectForm.campaignPublishEndpoint.trim(),
            browser_session_ref: connectForm.browserSessionRef.trim(),
            browser_catalog_target_url: connectForm.browserCatalogTargetUrl.trim(),
            browser_reply_target_url: connectForm.browserReplyTargetUrl.trim(),
            catalog_browser_recipe: catalogBrowserRecipe,
            community_reply_browser_recipe: communityReplyBrowserRecipe,
            provider: 'tiktok_shop',
            auth_method: 'official_browser_oauth',
            provider_mode: 'tiktok_shop_browser',
          },
          health_snapshot: {
            status: 'healthy',
            merchant_id: merchantId,
            seller_id: sellerId,
            shop_id: shopId,
            shop_cipher: shopCipher,
            shop_region: shopRegion,
            browser_session_ref: connectForm.browserSessionRef.trim(),
            browser_catalog_target_url: connectForm.browserCatalogTargetUrl.trim(),
            browser_reply_target_url: connectForm.browserReplyTargetUrl.trim(),
          },
        }),
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as GenericRecord
        throw new Error(asText(payload.error) || `tiktok_connect_complete_failed:${response.status}`)
      }

      setFlash({
        tone: 'success',
        message: 'TikTok Shop ist verbunden. Als Nächstes den Katalog spiegeln und die Community-Queue überwachen.',
      })
      setConnectForm((current) => ({
        ...current,
        accessToken,
        refreshToken,
        merchantId,
        sellerId,
        shopId,
        shopCipher,
        shopRegion,
        accountExternalId,
      }))
      refresh()
    } catch (actionError) {
      setFlash({
        tone: 'error',
        message: actionError instanceof Error ? actionError.message : 'tiktok_connect_complete_failed',
      })
    } finally {
      setCompletingConnect(false)
    }
  }

  const requestBrowserMetadataImport = async () => {
    if (!connectForm.stateToken.trim()) {
      setFlash({ tone: 'error', message: 'State-Token fehlt.' })
      return
    }
    setRequestingBrowserMetadata(true)
    setFlash(null)
    try {
      const response = await fetch('/api/admin/channels/tiktok/connect/browser-metadata', {
        method: 'POST',
        cache: 'no-store',
        headers: await getAuthHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify({
          state_token: connectForm.stateToken.trim(),
          browser_session_ref: connectForm.browserSessionRef.trim(),
          target_url: connectForm.browserCatalogTargetUrl.trim(),
          candidate_urls: uniqueTexts(connectForm.browserCatalogTargetUrl, connectForm.browserReplyTargetUrl),
          request_payload: {
            merchant_id: connectForm.merchantId.trim(),
            seller_id: connectForm.sellerId.trim(),
          },
        }),
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as GenericRecord
        throw new Error(asText(payload.error) || `channel_connect_browser_metadata_request_failed:${response.status}`)
      }
      setFlash({
        tone: 'success',
        message: 'Browser-Import für TikTok-Metadaten wurde angefordert. Nach dem Seller-Center-Harvest einfach Neu laden und dann Verbindung speichern.',
      })
    } catch (actionError) {
      setFlash({
        tone: 'error',
        message: actionError instanceof Error ? actionError.message : 'channel_connect_browser_metadata_request_failed',
      })
    } finally {
      setRequestingBrowserMetadata(false)
    }
  }

  const triggerCatalogSync = async () => {
    if (!connected) {
      setFlash({ tone: 'error', message: 'TikTok Shop ist noch nicht verbunden.' })
      return
    }
    if (!healthCatalogEndpoint && !browserCatalogConfigured) {
      setFlash({ tone: 'error', message: 'Für den Catalog-Mirror fehlt aktuell sowohl ein Endpoint als auch ein Browser-Runner-Kontext.' })
      return
    }
    setSyncingCatalog(true)
    setFlash(null)
    try {
      const catalogBrowserRecipe = parseJSONObjectText('Catalog Browser Recipe', connectForm.catalogBrowserRecipe)
      const response = await fetch('/api/admin/channels/tiktok/catalog/sync', {
        method: 'POST',
        cache: 'no-store',
        headers: await getAuthHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify({
          mirror_mode: 'shop_catalog_mirror',
          source: 'admin_channels_page',
          product_limit: 100,
          target_url: connectForm.browserCatalogTargetUrl.trim(),
          candidate_urls: uniqueTexts(connectForm.browserCatalogTargetUrl, connectForm.browserReplyTargetUrl),
          browser_recipe: catalogBrowserRecipe,
        }),
      })
      if (!response.ok) {
        throw new Error(`tiktok_catalog_sync_failed:${response.status}`)
      }
      setFlash({
        tone: 'success',
        message: browserCatalogConfigured
          ? 'TikTok-Katalog-Sync angefordert. Der Worker nutzt jetzt bevorzugt den Browser-Runner und fällt nur bei Bedarf auf einen Endpoint zurück.'
          : 'TikTok-Katalog-Sync angefordert. Der Worker überträgt jetzt aktive Shop-Produkte an den verbundenen Endpoint.',
      })
      refresh()
    } catch (actionError) {
      setFlash({
        tone: 'error',
        message: actionError instanceof Error ? actionError.message : 'tiktok_catalog_sync_failed',
      })
    } finally {
      setSyncingCatalog(false)
    }
  }

  const refreshChannelMetadata = async () => {
    if (!connected) {
      setFlash({ tone: 'error', message: 'TikTok Shop ist noch nicht verbunden.' })
      return
    }
    setRefreshingMetadata(true)
    setFlash(null)
    try {
      const response = await fetch('/api/admin/channels/tiktok/metadata/refresh', {
        method: 'POST',
        cache: 'no-store',
        headers: await getAuthHeaders(),
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as GenericRecord
        throw new Error(asText(payload.error) || `channel_metadata_refresh_failed:${response.status}`)
      }
      const payload = (await response.json()) as GenericRecord
      setHealth(payload || {})
      setFlash({
        tone: 'success',
        message: 'TikTok-Shop-Metadaten wurden aktualisiert. Shop-Name, Region und verfügbare Shops sind jetzt neu geladen.',
      })
      refresh()
    } catch (actionError) {
      setFlash({
        tone: 'error',
        message: actionError instanceof Error ? actionError.message : 'channel_metadata_refresh_failed',
      })
    } finally {
      setRefreshingMetadata(false)
    }
  }

  const triggerContentPipeline = async () => {
    if (!connected) {
      setFlash({ tone: 'error', message: 'TikTok Shop ist noch nicht verbunden.' })
      return
    }
    if (!healthCampaignEndpoint) {
      setFlash({ tone: 'error', message: 'Für die Content-Pipeline fehlt ein Campaign-/Posting-Endpoint.' })
      return
    }
    setStartingContent(true)
    setFlash(null)
    try {
      const response = await fetch('/api/admin/channels/tiktok/campaigns/publish', {
        method: 'POST',
        cache: 'no-store',
        headers: await getAuthHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify({
          source: 'admin_channels_page',
          publish_mode: 'draft',
          brief: 'Erzeuge TikTok-Shop-Produktbeiträge auf Basis des aktiven Shop-Katalogs.',
        }),
      })
      if (!response.ok) {
        throw new Error(`tiktok_campaign_publish_failed:${response.status}`)
      }
      setFlash({
        tone: 'success',
        message: 'Content-Pipeline gestartet. Neue TikTok-Shop-Beiträge können jetzt über den verbundenen Posting-Endpoint erzeugt werden.',
      })
      refresh()
    } catch (actionError) {
      setFlash({
        tone: 'error',
        message: actionError instanceof Error ? actionError.message : 'tiktok_campaign_publish_failed',
      })
    } finally {
      setStartingContent(false)
    }
  }

  const patchTask = async (taskId: string, status: 'in_progress' | 'done') => {
    setPatchingTaskId(taskId)
    setFlash(null)
    try {
      const response = await fetch(`/api/admin/crm/tasks/${taskId}`, {
        method: 'PATCH',
        cache: 'no-store',
        headers: await getAuthHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify({ status }),
      })
      if (!response.ok) {
        throw new Error(`community_task_patch_failed:${response.status}`)
      }
      setFlash({
        tone: 'success',
        message: status === 'done' ? 'Task als erledigt markiert.' : 'Task in Bearbeitung gesetzt.',
      })
      refresh()
    } catch (actionError) {
      setFlash({
        tone: 'error',
        message: actionError instanceof Error ? actionError.message : 'community_task_patch_failed',
      })
    } finally {
      setPatchingTaskId(null)
    }
  }

  const generateReplyDraft = async (task: GenericRecord) => {
    const taskId = asText(task.id)
    if (!taskId) {
      return
    }
    setDraftingTaskId(taskId)
    setFlash(null)
    try {
      const prompt = buildReplyPrompt(task)
      const headers = await getAuthHeaders({ 'content-type': 'application/json' })
      const draftResponse = await fetch('/api/ai/chat', {
        method: 'POST',
        cache: 'no-store',
        headers,
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          context: { session_id: `community-reply-${taskId}` },
        }),
      })
      if (!draftResponse.ok) {
        throw new Error(`community_reply_draft_failed:${draftResponse.status}`)
      }
      const draftPayload = (await draftResponse.json()) as { message?: string }
      const draft = (draftPayload.message || '').trim()
      if (!draft) {
        throw new Error('community_reply_draft_empty')
      }

      const noteResponse = await fetch('/api/admin/crm/notes', {
        method: 'POST',
        cache: 'no-store',
        headers,
        body: JSON.stringify({
          entity_type: 'channel',
          entity_id: 'tiktok',
          note: `Antwortentwurf\n${draft}`,
          visibility: 'internal',
          metadata: {
            task_id: taskId,
            draft_type: 'community_reply',
            source: 'admin_channels_page',
            conversation_key: asText((task.metadata as GenericRecord | undefined)?.conversation_key),
          },
        }),
      })
      if (!noteResponse.ok) {
        throw new Error(`community_reply_note_failed:${noteResponse.status}`)
      }

      setDraftsByTask((current) => ({ ...current, [taskId]: draft }))
      if (asText(task.status) === 'open') {
        const taskResponse = await fetch(`/api/admin/crm/tasks/${taskId}`, {
          method: 'PATCH',
          cache: 'no-store',
          headers,
          body: JSON.stringify({ status: 'in_progress' }),
        })
        if (!taskResponse.ok) {
          throw new Error(`community_reply_task_patch_failed:${taskResponse.status}`)
        }
      }
      setFlash({
        tone: 'success',
        message: 'Antwortentwurf erstellt, als CRM-Note gespeichert und der Task ist jetzt in Bearbeitung.',
      })
      refresh()
    } catch (actionError) {
      setFlash({
        tone: 'error',
        message: actionError instanceof Error ? actionError.message : 'community_reply_draft_failed',
      })
    } finally {
      setDraftingTaskId(null)
    }
  }

  const sendReply = async (task: GenericRecord) => {
    const taskId = asText(task.id)
    const replyText = draftsByTask[taskId]?.trim()
    if (!taskId || !replyText) {
      setFlash({ tone: 'error', message: 'Für diesen Task liegt noch kein Antwortentwurf vor.' })
      return
    }
    setSendingTaskId(taskId)
    setFlash(null)
    try {
      const response = await fetch('/api/admin/channels/tiktok/community/replies', {
        method: 'POST',
        cache: 'no-store',
        headers: await getAuthHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify({
          task_id: taskId,
          reply_text: replyText,
          mark_done: true,
          target_url: connectForm.browserReplyTargetUrl.trim(),
          candidate_urls: uniqueTexts(
            connectForm.browserReplyTargetUrl,
            connectForm.browserCatalogTargetUrl,
            asText((task.metadata as GenericRecord | undefined)?.source_url),
          ),
          browser_recipe: parseJSONObjectText('Community Reply Recipe', connectForm.communityReplyBrowserRecipe),
        }),
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as GenericRecord
        throw new Error(asText(payload.error) || `community_reply_send_failed:${response.status}`)
      }
      setFlash({
        tone: 'success',
        message: browserReplyConfigured
          ? 'Antwort wurde angefordert. Der Worker nutzt bei TikTok jetzt bevorzugt den Browser-Runner und fällt sonst auf Endpoint oder Bridge zurück.'
          : 'Antwort wurde zur Ausspielung an Worker oder Automation-Bridge übergeben.',
      })
      refresh()
    } catch (actionError) {
      setFlash({
        tone: 'error',
        message: actionError instanceof Error ? actionError.message : 'community_reply_send_failed',
      })
    } finally {
      setSendingTaskId(null)
    }
  }

  return (
    <main className="pb-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-eyebrow">Channels</p>
          <h1 className="mt-2 text-4xl">TikTok Shop Control</h1>
            <p className="mt-3 max-w-3xl text-brand-text-muted">
              Ein klarer Arbeitsmodus statt Channel-Overload: TikTok verbinden, Shop-Katalog spiegeln, Content-Pipeline starten und die
              Community-Inbox ohne Leerlauf abarbeiten.
            </p>
          </div>
          <Button variant="outline" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={refresh}>
            Neu laden
          </Button>
        </header>

        {flash ? (
          <p className={['mb-4 rounded-2xl px-4 py-3 text-sm', flash.tone === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'].join(' ')}>
            {flash.message}
          </p>
        ) : null}
        {error ? <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        <section className="panel mb-4 grid gap-3 p-4 lg:grid-cols-[1.3fr_repeat(4,minmax(0,1fr))]">
          <article className="rounded-2xl border border-brand-border bg-brand-surface px-4 py-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 rounded-full bg-black p-2 text-white">
                <Store className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-brand-text">Nur die vier Entscheidungen, die zählen</p>
                <p className="mt-1 text-sm text-brand-text-muted">
                  Browser-OAuth verbinden, Endpoints setzen, Katalog spiegeln, Community-Tasks sofort abarbeiten. Alles andere bleibt aus dem Weg.
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-brand-border bg-brand-surface px-4 py-4">
            <p className="text-sm text-brand-text-muted">TikTok Status</p>
            <p className="mt-2 text-3xl font-semibold text-brand-text">{formatStatus(asText(health.status) || asText(tiktokAccount.status))}</p>
            <p className="mt-3 text-sm text-brand-text-muted">Modus: {asText(health.connection_mode) || asText(tiktokAccount.connection_mode) || 'browser_oauth'}</p>
          </article>

          <article className="rounded-2xl border border-brand-border bg-brand-surface px-4 py-4">
            <p className="text-sm text-brand-text-muted">Offene Community-Tasks</p>
            <p className="mt-2 text-3xl font-semibold text-brand-text">{summary.openCount}</p>
            <p className="mt-3 text-sm text-brand-text-muted">{summary.urgentCount} davon urgent</p>
          </article>

          <article className="rounded-2xl border border-brand-border bg-brand-surface px-4 py-4">
            <p className="text-sm text-brand-text-muted">Events 24h</p>
            <p className="mt-2 text-3xl font-semibold text-brand-text">{summary.events24h}</p>
            <p className="mt-3 text-sm text-brand-text-muted">{summary.projectionErrors} Projektionfehler</p>
          </article>

          <article className="rounded-2xl border border-brand-border bg-brand-surface px-4 py-4">
            <p className="text-sm text-brand-text-muted">Shop Identität</p>
            <p className="mt-2 text-lg font-semibold text-brand-text">{asText(health.shop_name) || asText(health.shop_id) || 'Nicht hinterlegt'}</p>
            <p className="mt-3 text-sm text-brand-text-muted">Merchant: {asText(health.merchant_id) || '—'}</p>
            <p className="mt-1 text-sm text-brand-text-muted">Shops verfügbar: {String(health.available_shop_count || 0)}</p>
          </article>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <section className="panel p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="section-eyebrow">Verbindung</p>
                  <h2 className="mt-1 text-2xl">TikTok Shop verbinden</h2>
                </div>
                <Badge variant={badgeVariantForStatus(asText(health.status) || asText(tiktokAccount.status))}>
                  {formatStatus(asText(health.status) || asText(tiktokAccount.status))}
                </Badge>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <article className="rounded-2xl border border-brand-border bg-white px-4 py-4">
                  <p className="text-sm font-semibold text-brand-text">Nächster Schritt</p>
                  <p className="mt-2 text-sm text-brand-text-muted">
                    {connected
                      ? 'Katalog spiegeln und danach Content-Pipeline aktivieren.'
                      : 'Wenn noch kein Seller-Account existiert: zuerst die deutsche Seller-Registrierung im Standardbrowser öffnen. Danach offiziellen Browser-Login starten.'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" leftIcon={<Store className="h-4 w-4" />} onClick={startRegistration} isLoading={startingRegistration}>
                      Registrierung starten
                    </Button>
                    <Button leftIcon={<Workflow className="h-4 w-4" />} onClick={startConnect} isLoading={startingConnect}>
                      Browser-Connect starten
                    </Button>
                    <Button
                      variant="outline"
                      leftIcon={<Store className="h-4 w-4" />}
                      onClick={requestBrowserMetadataImport}
                      isLoading={requestingBrowserMetadata}
                    >
                      Browser-Import anfordern
                    </Button>
                    <Button variant="outline" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={refreshChannelMetadata} isLoading={refreshingMetadata}>
                      Metadaten aktualisieren
                    </Button>
                    {connectURL ? (
                      <Link href={connectURL} target="_blank" rel="noreferrer">
                        <Button variant="outline" leftIcon={<ArrowUpRight className="h-4 w-4" />}>
                          Login-Tab öffnen
                        </Button>
                      </Link>
                    ) : null}
                  </div>
                </article>

                <article className="rounded-2xl border border-brand-border bg-white px-4 py-4">
                  <p className="text-sm font-semibold text-brand-text">Live-Metadaten</p>
                  <dl className="mt-3 space-y-2 text-sm text-brand-text-muted">
                    <div className="flex items-center justify-between gap-3">
                      <dt>Letzter Connect</dt>
                      <dd className="font-medium text-brand-text">{formatDate(health.last_connected_at || tiktokAccount.last_connected_at)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt>Shop Name</dt>
                      <dd className="max-w-[14rem] truncate font-medium text-brand-text">{asText(health.shop_name) || 'Nicht geladen'}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt>Metadata Refresh</dt>
                      <dd className="font-medium text-brand-text">{formatDate(health.metadata_refreshed_at)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt>Catalog Endpoint</dt>
                      <dd className="max-w-[14rem] truncate font-medium text-brand-text">{healthCatalogEndpoint || 'Nicht gesetzt'}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt>Campaign Endpoint</dt>
                      <dd className="max-w-[14rem] truncate font-medium text-brand-text">{healthCampaignEndpoint || 'Nicht gesetzt'}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt>Browser Session</dt>
                      <dd className="max-w-[14rem] truncate font-medium text-brand-text">{browserSessionReady || 'Nicht hinterlegt'}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt>A2A Creator</dt>
                      <dd className="max-w-[14rem] truncate font-medium text-brand-text">{formatStatus(asText(a2aCreator.connectIssue) || (a2aCreator.connectReady ? 'ready' : 'blocked'))}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt>A2A Shop</dt>
                      <dd className="max-w-[14rem] truncate font-medium text-brand-text">{formatStatus(asText(a2aShop.connectIssue) || (a2aShop.connectReady ? 'ready' : 'blocked'))}</dd>
                    </div>
                  </dl>
                </article>
              </div>

              <div className="mt-5 rounded-2xl border border-brand-border bg-white px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-brand-text">SIN A2A Control Plane</p>
                    <p className="mt-1 text-sm text-brand-text-muted">
                      Simone nutzt für TikTok jetzt die spezialisierten A2A-Agenten statt nur die lokale Shop-Sonderlogik. Die bisherigen Felder bleiben als Fallback erhalten.
                    </p>
                  </div>
                  <Badge variant={a2aCreator.connectReady || a2aShop.connectReady ? 'success' : 'warning'}>
                    {a2aCreator.connectReady || a2aShop.connectReady ? 'A2A aktiv' : 'A2A vorbereiten'}
                  </Badge>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <article className="rounded-2xl border border-brand-border bg-brand-surface px-4 py-4">
                    <p className="text-sm font-semibold text-brand-text">SIN-TikTok</p>
                    <p className="mt-2 text-sm text-brand-text-muted">
                      Connect Ready: {String(Boolean(a2aCreator.connectReady))} · Creator Profiles: {String((a2aCreatorSession.creatorProfiles as unknown[] | undefined)?.length || 0)}
                    </p>
                    <p className="mt-2 text-sm text-brand-text-muted">
                      Redirect: {asText(a2aCreator.redirectUri) || '—'}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {creatorGuideURL ? (
                        <Link href={creatorGuideURL} target="_blank" rel="noreferrer">
                          <Button variant="outline" leftIcon={<ArrowUpRight className="h-4 w-4" />}>
                            SIN-TikTok Guide
                          </Button>
                        </Link>
                      ) : null}
                    </div>
                  </article>

                  <article className="rounded-2xl border border-brand-border bg-brand-surface px-4 py-4">
                    <p className="text-sm font-semibold text-brand-text">SIN-TikTok-Shop</p>
                    <p className="mt-2 text-sm text-brand-text-muted">
                      Connect Ready: {String(Boolean(a2aShop.connectReady))} · Seller Profiles: {String((a2aShopSession.sellerProfiles as unknown[] | undefined)?.length || 0)}
                    </p>
                    <p className="mt-2 text-sm text-brand-text-muted">
                      Shop: {pickText((a2aShopOnboarding.state as GenericRecord | undefined)?.shopName, health.shop_name, health.shop_code) || 'Nicht hinterlegt'}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {shopGuideURL ? (
                        <Link href={shopGuideURL} target="_blank" rel="noreferrer">
                          <Button variant="outline" leftIcon={<ArrowUpRight className="h-4 w-4" />}>
                            SIN-TikTok-Shop Guide
                          </Button>
                        </Link>
                      ) : null}
                      {shopTeamGuideURL ? (
                        <Link href={shopTeamGuideURL} target="_blank" rel="noreferrer">
                          <Button variant="outline" leftIcon={<ArrowUpRight className="h-4 w-4" />}>
                            Shop-Team
                          </Button>
                        </Link>
                      ) : null}
                      {shopReferenceTabURL ? (
                        <Link href={shopReferenceTabURL} target="_blank" rel="noreferrer">
                          <Button variant="outline" leftIcon={<ArrowUpRight className="h-4 w-4" />}>
                            A2A Card
                          </Button>
                        </Link>
                      ) : null}
                    </div>
                  </article>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-brand-border bg-brand-surface px-4 py-4">
                <p className="text-sm font-semibold text-brand-text">Pflichtschritte</p>
                <ol className="mt-3 space-y-2 text-sm text-brand-text-muted">
                  {requiredSteps.map((step, index) => (
                    <li key={step} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-black text-xs font-semibold text-white">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
                {channelFromQuery === 'tiktok' && stateFromQuery ? (
                  <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    State-Token aus der URL wurde bereits übernommen. Token und Shop-Hinweise werden nach dem Callback soweit möglich automatisch vorbefüllt.
                  </p>
                ) : null}
                {registrationResult ? (
                  <div className="mt-3 rounded-xl bg-brand-surface px-3 py-3 text-sm text-brand-text-muted">
                    <p className="font-semibold text-brand-text">
                      Registrierung {formatStatus(asText(registrationResult.status) || 'started')}
                    </p>
                    <p className="mt-1">
                      Ziel: {asText(registrationResult.registration_url) || 'Nicht gesetzt'}
                    </p>
                    {asText(registrationResult.guide_title) ? <p className="mt-1">Guide: {asText(registrationResult.guide_title)}</p> : null}
                    {asText(registrationResult.guide_excerpt) ? <p className="mt-2">{asText(registrationResult.guide_excerpt)}</p> : null}
                    {Array.isArray(registrationResult.required_steps) && registrationResult.required_steps.length > 0 ? (
                      <ul className="mt-2 space-y-1">
                        {registrationResult.required_steps.slice(0, 4).map((step) => (
                          <li key={String(step)}>{String(step)}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <Input label="State Token" value={connectForm.stateToken} onChange={(event) => updateForm('stateToken', event.target.value)} />
                <Input
                  label="Account External ID"
                  hint="Optional. Fällt sonst automatisch auf Shop-/Seller-ID zurück."
                  value={connectForm.accountExternalId}
                  onChange={(event) => updateForm('accountExternalId', event.target.value)}
                />
                <Input
                  label="OAuth Access Token"
                  hint="Wird nach dem offiziellen Callback automatisch eingetragen."
                  value={connectForm.accessToken}
                  onChange={(event) => updateForm('accessToken', event.target.value)}
                  autoComplete="off"
                />
                <Input
                  label="Refresh Token"
                  hint="Kommt ebenfalls aus dem TikTok OAuth Callback."
                  value={connectForm.refreshToken}
                  onChange={(event) => updateForm('refreshToken', event.target.value)}
                  autoComplete="off"
                />
                <Input
                  label="Merchant ID"
                  hint="Nur nötig, wenn TikTok sie nicht automatisch liefert."
                  value={connectForm.merchantId}
                  onChange={(event) => updateForm('merchantId', event.target.value)}
                />
                <Input
                  label="Seller ID"
                  hint="Fallback, falls Merchant ID nicht separat kommt."
                  value={connectForm.sellerId}
                  onChange={(event) => updateForm('sellerId', event.target.value)}
                />
                <Input
                  label="Shop ID"
                  hint="Wird aus Shop-Lookup vorbefüllt, sobald TikTok sie freigibt."
                  value={connectForm.shopId}
                  onChange={(event) => updateForm('shopId', event.target.value)}
                />
                <Input
                  label="Shop Cipher"
                  hint="Nur Fallback, wenn statt Shop ID nur eine sekundäre Shop-Kennung vorliegt."
                  value={connectForm.shopCipher}
                  onChange={(event) => updateForm('shopCipher', event.target.value)}
                />
                <Input label="Shop Region" value={connectForm.shopRegion} onChange={(event) => updateForm('shopRegion', event.target.value.toUpperCase())} />
                <Input
                  label="Browser Session Ref"
                  value={connectForm.browserSessionRef}
                  onChange={(event) => updateForm('browserSessionRef', event.target.value)}
                />
                <Input
                  label="Registration Target URL"
                  hint="Optional. Akzeptiert werden nur seller-de.tiktok.com oder seller-de-accounts.tiktok.com."
                  value={connectForm.registrationTargetUrl}
                  onChange={(event) => updateForm('registrationTargetUrl', event.target.value)}
                />
                <Input
                  label="Google Doc URL"
                  hint="Optional. Das Dokument muss mit dem Service-Account geteilt sein."
                  value={connectForm.registrationGuideUrl}
                  onChange={(event) => updateForm('registrationGuideUrl', event.target.value)}
                />
                <Input
                  label="Product Save Endpoint"
                  hint="Pflicht für echten Katalog-Mirror."
                  value={connectForm.productSaveEndpoint}
                  onChange={(event) => updateForm('productSaveEndpoint', event.target.value)}
                  className="md:col-span-2"
                />
                <Input
                  label="Campaign / Posting Endpoint"
                  hint="Optional für automatische Beitrags-Pipeline."
                  value={connectForm.campaignPublishEndpoint}
                  onChange={(event) => updateForm('campaignPublishEndpoint', event.target.value)}
                  className="md:col-span-2"
                />
              </div>

              <div className="mt-5 rounded-2xl border border-brand-border bg-white px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-brand-text">Browser Runner</p>
                    <p className="mt-1 text-sm text-brand-text-muted">
                      Nur für echte TikTok-Browser-Aktionen: Seller-Center-Zielseiten und optionale JSON-Rezepte für Katalog-Upload und Reply-Dispatch.
                    </p>
                  </div>
                  <Badge variant={browserCatalogConfigured || browserReplyConfigured ? 'success' : 'outline'}>
                    {browserCatalogConfigured || browserReplyConfigured ? 'Browser-Pfad vorbereitet' : 'Optional'}
                  </Badge>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <Input
                    label="Catalog Target URL"
                    hint="Optional. Standard ist Seller-Center Products/Create."
                    value={connectForm.browserCatalogTargetUrl}
                    onChange={(event) => updateForm('browserCatalogTargetUrl', event.target.value)}
                  />
                  <Input
                    label="Reply Target URL"
                    hint="Optional. Standard sind Message-/Comment-Seiten."
                    value={connectForm.browserReplyTargetUrl}
                    onChange={(event) => updateForm('browserReplyTargetUrl', event.target.value)}
                  />
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-brand-text">Catalog Browser Recipe</label>
                    <textarea
                      rows={7}
                      value={connectForm.catalogBrowserRecipe}
                      onChange={(event) => updateForm('catalogBrowserRecipe', event.target.value)}
                      placeholder='{"catalog_product_steps":[{"action":"click","selector":"button:has-text(\"Add product\")"}]}'
                      className="w-full rounded-xl border border-brand-border bg-white px-4 py-3 font-mono text-xs text-brand-text placeholder:text-brand-text-muted focus:border-brand-accent focus:outline-none"
                    />
                    <p className="mt-1.5 text-xs text-brand-text-muted">Optionales JSON-Objekt. Leer bedeutet Heuristik-Modus.</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-brand-text">Community Reply Recipe</label>
                    <textarea
                      rows={7}
                      value={connectForm.communityReplyBrowserRecipe}
                      onChange={(event) => updateForm('communityReplyBrowserRecipe', event.target.value)}
                      placeholder='{"reply_steps":[{"action":"fill","selector":"textarea","value":"{{reply_text}}"}]}'
                      className="w-full rounded-xl border border-brand-border bg-white px-4 py-3 font-mono text-xs text-brand-text placeholder:text-brand-text-muted focus:border-brand-accent focus:outline-none"
                    />
                    <p className="mt-1.5 text-xs text-brand-text-muted">
                      Optionales JSON-Objekt. Tokens wie {'{{reply_text}}'}, {'{{comment_id}}'}, {'{{post_id}}'} werden ersetzt.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={completeConnect} isLoading={completingConnect}>
                  Verbindung speichern
                </Button>
                {connectMeta?.oauth_guide_url ? (
                  <Link href={String(connectMeta.oauth_guide_url)} target="_blank" rel="noreferrer">
                    <Button variant="outline" leftIcon={<ArrowUpRight className="h-4 w-4" />}>
                      OAuth Guide
                    </Button>
                  </Link>
                ) : null}
              </div>
            </section>

            <section className="panel p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="section-eyebrow">Distribution</p>
                  <h2 className="mt-1 text-2xl">Shop auf TikTok spiegeln</h2>
                  <p className="mt-2 text-sm text-brand-text-muted">
                    Der Catalog-Sync transportiert aktive Shop-Produkte mit Preis, Bestand, Bildern, Kategorie und Supplier-Kontext. Bei TikTok nutzt der
                    Worker jetzt bevorzugt den Browser-Runner und fällt nur sonst auf den Endpoint-Pfad zurück.
                  </p>
                </div>
                <Badge variant={healthCatalogEndpoint || browserCatalogConfigured ? 'success' : 'warning'}>
                  {browserCatalogConfigured ? 'Browser Runner bereit' : healthCatalogEndpoint ? 'Endpoint bereit' : 'Kontext fehlt'}
                </Badge>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <article className="rounded-2xl border border-brand-border bg-white px-4 py-4">
                  <p className="text-sm font-semibold text-brand-text">Catalog Mirror</p>
                  <p className="mt-2 text-sm text-brand-text-muted">
                    Produktlimit: 100 aktive Artikel pro Lauf. Der Worker baut dafür eine echte Mirror-Payload aus dem Shop-Katalog.
                  </p>
                  <div className="mt-4">
                    <Button leftIcon={<ShoppingBag className="h-4 w-4" />} onClick={triggerCatalogSync} isLoading={syncingCatalog}>
                      Katalog spiegeln
                    </Button>
                  </div>
                </article>

                <article className="rounded-2xl border border-brand-border bg-white px-4 py-4">
                  <p className="text-sm font-semibold text-brand-text">Content Pipeline</p>
                  <p className="mt-2 text-sm text-brand-text-muted">
                    Nutzt den verbundenen Posting-Endpoint, um TikTok-Shop-Beitrags-Drafts aus dem Shop-Katalog zu erzeugen.
                  </p>
                  <div className="mt-4">
                    <Button variant="outline" leftIcon={<Send className="h-4 w-4" />} onClick={triggerContentPipeline} isLoading={startingContent}>
                      Beitrags-Pipeline starten
                    </Button>
                  </div>
                </article>
              </div>
            </section>
          </div>

          <div className="space-y-4">
            <section className="panel p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="section-eyebrow">Community</p>
                  <h2 className="mt-1 text-2xl">Always-on Queue</h2>
                </div>
                <Badge variant={summary.urgentCount > 0 ? 'danger' : summary.openCount > 0 ? 'warning' : 'success'}>
                  {summary.urgentCount > 0 ? 'Urgent offen' : summary.openCount > 0 ? 'Abarbeiten' : 'Inbox sauber'}
                </Badge>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <article className="rounded-2xl border border-brand-border bg-white px-4 py-4">
                  <p className="text-xs uppercase tracking-wide text-brand-text-muted">Open</p>
                  <p className="mt-2 text-2xl font-semibold text-brand-text">{summary.openCount}</p>
                </article>
                <article className="rounded-2xl border border-brand-border bg-white px-4 py-4">
                  <p className="text-xs uppercase tracking-wide text-brand-text-muted">In Progress</p>
                  <p className="mt-2 text-2xl font-semibold text-brand-text">{summary.inProgressCount}</p>
                </article>
                <article className="rounded-2xl border border-brand-border bg-white px-4 py-4">
                  <p className="text-xs uppercase tracking-wide text-brand-text-muted">Urgent</p>
                  <p className="mt-2 text-2xl font-semibold text-brand-text">{summary.urgentCount}</p>
                </article>
              </div>

              <div className="mt-5 space-y-3">
                {loading ? <p className="text-sm text-brand-text-muted">Lade Community-Daten…</p> : null}
                {!loading && openTasks.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-brand-border px-4 py-4 text-sm text-brand-text-muted">
                    Keine offenen TikTok-Tasks. Neue Kommentare oder DMs landen hier automatisch als CRM-Queue.
                  </p>
                ) : null}
                {openTasks.map((task) => {
                  const taskId = asText(task.id)
                  return (
                    <article key={taskId} className="rounded-2xl border border-brand-border bg-white px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-brand-text">{asText(task.title) || 'Community Task'}</p>
                          <p className="mt-1 text-sm text-brand-text-muted">{asText(task.description) || 'Keine Beschreibung vorhanden.'}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={badgeVariantForStatus(asText(task.priority))}>{formatStatus(asText(task.priority) || 'medium')}</Badge>
                          <Badge variant={badgeVariantForStatus(asText(task.status))}>{formatStatus(asText(task.status) || 'open')}</Badge>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generateReplyDraft(task)}
                          isLoading={draftingTaskId === taskId}
                        >
                          Antwortentwurf
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => patchTask(taskId, 'in_progress')}
                          isLoading={patchingTaskId === taskId}
                        >
                          In Bearbeitung
                        </Button>
                        <Button size="sm" onClick={() => patchTask(taskId, 'done')} isLoading={patchingTaskId === taskId}>
                          Erledigt
                        </Button>
                        {draftsByTask[taskId] ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => sendReply(task)}
                            isLoading={sendingTaskId === taskId}
                          >
                            Antwort senden
                          </Button>
                        ) : null}
                      </div>
                      {draftsByTask[taskId] ? (
                        <div className="mt-4 rounded-2xl bg-brand-surface px-4 py-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-brand-text-muted">KI Antwortentwurf</p>
                          <p className="mt-2 whitespace-pre-wrap text-sm text-brand-text">{draftsByTask[taskId]}</p>
                        </div>
                      ) : null}
                    </article>
                  )
                })}
              </div>

              <div className="mt-5">
                <Link href="/admin/crm" className="text-sm font-semibold text-brand-text underline-offset-4 hover:underline">
                  Vollen CRM Hub öffnen
                </Link>
              </div>
            </section>

            <section className="panel p-5">
              <div className="flex items-center gap-2">
                <MessageSquareText className="h-5 w-5 text-brand-text" />
                <h2 className="text-xl">Neueste Interaktionen</h2>
              </div>
              <div className="mt-4 space-y-3">
                {recentEvents.length === 0 ? <p className="text-sm text-brand-text-muted">Noch keine TikTok-Events im Eingang.</p> : null}
                {recentEvents.map((event) => (
                  <article key={asText(event.event_id) || asText(event.id)} className="rounded-2xl border border-brand-border bg-white px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-brand-text">
                        {asText(event.author_handle) || asText(event.author_name) || 'Unbekannt'} · {formatStatus(asText(event.event_type))}
                      </p>
                      <Badge variant={badgeVariantForStatus(asText(event.status))}>{formatStatus(asText(event.status) || 'ingested')}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-brand-text-muted">{asText(event.text_preview) || 'Kein Textinhalt vorhanden.'}</p>
                    <p className="mt-3 text-xs text-brand-text-muted">Empfangen: {formatDate(event.received_at)}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="panel p-5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-brand-text" />
                <h2 className="text-xl">Aktivitäten & Notes</h2>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="space-y-3">
                  {recentActivities.slice(0, 4).map((activity) => (
                    <article key={asText(activity.id)} className="rounded-2xl border border-brand-border bg-white px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-brand-text">{formatStatus(asText(activity.activity_type))}</p>
                        <Badge variant={badgeVariantForStatus(asText(activity.severity))}>{formatStatus(asText(activity.severity) || 'info')}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-brand-text-muted">{asText(activity.message)}</p>
                    </article>
                  ))}
                  {recentActivities.length === 0 ? <p className="text-sm text-brand-text-muted">Noch keine Aktivitäten.</p> : null}
                </div>
                <div className="space-y-3">
                  {recentNotes.slice(0, 4).map((note) => (
                    <article key={asText(note.id)} className="rounded-2xl border border-brand-border bg-white px-4 py-4">
                      <p className="text-sm text-brand-text-muted">{asText(note.note) || 'Leere Note'}</p>
                      <p className="mt-3 text-xs text-brand-text-muted">Erfasst: {formatDate(note.created_at)}</p>
                    </article>
                  ))}
                  {recentNotes.length === 0 ? <p className="text-sm text-brand-text-muted">Noch keine Notes.</p> : null}
                </div>
              </div>
            </section>
          </div>
        </section>
    </main>
  )
}

export default function AdminChannelsPage() {
  return (
    <Suspense
      fallback={
        <main className="pb-10">
          <p className="text-sm text-brand-text-muted">Lade Channel Control Plane…</p>
        </main>
      }
    >
      <AdminChannelsPageContent />
    </Suspense>
  )
}

function buildReplyPrompt(task: GenericRecord) {
  const metadata = (task.metadata as GenericRecord | undefined) || {}
  const author = asText(metadata.author_handle) || asText(metadata.author_name) || 'Unbekannt'
  const eventType = asText(metadata.event_type) || 'community_message'
  const originalText = asText(metadata.text_preview) || asText(task.description)
  const productRef = asText(metadata.product_ref)

  const contextParts = [
    'Du bist Community Manager für Simone Shop auf TikTok Shop.',
    'Schreibe genau eine kurze Antwort auf Deutsch.',
    'Ton: freundlich, sicher, hilfreich, vertrauenswürdig, nicht aggressiv.',
    'Ziel: die Person sinnvoll weiterführen und wenn passend in Richtung Kauf oder Rückfrage lenken.',
    'Keine Emojis. Keine erfundenen Fakten. Keine Rabatte versprechen, die nicht genannt wurden.',
    `Format des Eingangs: ${eventType}.`,
    `Absender: ${author}.`,
  ]

  if (productRef) {
    contextParts.push(`Produktbezug: ${productRef}.`)
  }
  if (originalText) {
    contextParts.push(`Originalnachricht: ${originalText}`)
  }

  contextParts.push('Gib nur den finalen Antworttext zurück, ohne Einleitung oder Erklärung.')
  return contextParts.join('\n')
}
