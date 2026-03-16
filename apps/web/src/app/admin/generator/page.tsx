/* eslint-disable @next/next/no-img-element */
'use client'

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { AlertTriangle, ChevronDown, ImagePlus, RefreshCw, Sparkles, UploadCloud, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { getAuthHeaders } from '@/lib/api/auth'

type ProductItem = {
  id: string
  name: string
  description?: string
  images?: string[]
  price?: number
}

type ProductResponse = {
  data?: {
    products?: ProductItem[]
  }
}

type PersonAsset = {
  id: string
  label: string
  source_kind: string
  is_default?: boolean
  image_url?: string
  preview_url?: string
  metadata?: Record<string, unknown>
}

type PersonAssetResponse = {
  items?: PersonAsset[]
}

type GeneratorSettings = {
  enabled: boolean
  mode: 'manual' | 'auto'
  default_output_pack: 'single' | 'hero_plus_three' | 'hero_plus_3' | 'five_pack' | 'pack_5'
  default_audio_mode: 'subtitles_only' | 'captions_only' | 'voice_subtitles' | 'voice_and_captions' | 'voice_and_silent'
  default_aspect_ratio: '9:16' | '1:1' | '16:9'
  default_render_lane: 'fast' | 'balanced' | 'quality'
  preferred_render_provider: 'auto' | 'hybrid' | 'modal' | 'nvidia'
  preferred_language: string
  requires_human_review: boolean
  max_runs_per_product_per_day: number
}

type JobListItem = {
  id: string
  title: string
  status: string
  status_message?: string
  trigger_mode: string
  product_name?: string
  person_label?: string
  hero_preview_url?: string
  person_preview_url?: string
  updated_at?: string
  variant_count?: number
}

type JobsResponse = {
  items?: JobListItem[]
}

type PostingQueueItem = {
  id: string
  channel: string
  status: string
  product_name?: string
  variant_label?: string
  scheduled_for?: string
  posted_at?: string
  delete_after_posted?: boolean
  asset?: {
    status?: string
  }
}

type PostingQueueResponse = {
  items?: PostingQueueItem[]
}

type RunVariant = {
  id: string
  variant_role: string
  variant_label: string
  status: string
  preview_url?: string
  video_url?: string
  thumbnail_url?: string
  script_text?: string
  subtitle_text?: string
}

type RunDetail = {
  run?: JobListItem & {
    last_error?: string
    input_payload?: Record<string, unknown>
    settings_snapshot?: Record<string, unknown>
    product?: ProductItem
    person_asset?: PersonAsset
  }
  variants?: RunVariant[]
}

const statusTone: Record<string, string> = {
  ready: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  claimed: 'border-sky-200 bg-sky-50 text-sky-800',
  queued: 'border-amber-200 bg-amber-50 text-amber-800',
  planning: 'border-sky-200 bg-sky-50 text-sky-800',
  generating: 'border-sky-200 bg-sky-50 text-sky-800',
  voicing: 'border-indigo-200 bg-indigo-50 text-indigo-800',
  qa_review: 'border-zinc-200 bg-zinc-100 text-zinc-800',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  posted: 'border-zinc-200 bg-zinc-100 text-zinc-800',
  deleted: 'border-zinc-200 bg-zinc-50 text-zinc-600',
  failed: 'border-red-200 bg-red-50 text-red-800',
}

function prettyStatus(status: string) {
  switch (status) {
    case 'ready':
      return 'Bereit'
    case 'claimed':
      return 'Reserviert'
    case 'queued':
      return 'Wartet'
    case 'planning':
      return 'Plant'
    case 'generating':
      return 'Erstellt'
    case 'voicing':
      return 'Vertont'
    case 'qa_review':
      return 'Prüft'
    case 'completed':
      return 'Fertig'
    case 'posted':
      return 'Gepostet'
    case 'deleted':
      return 'Entfernt'
    case 'failed':
      return 'Fehlgeschlagen'
    default:
      return status
  }
}

function outputPackLabel(value: string | undefined) {
  if (value === 'pack_5' || value === 'five_pack') {
    return '5 Varianten'
  }
  if (value === 'single') {
    return '1 Clip'
  }
  return 'Hero + 3 Varianten'
}

function audioModeLabel(value: string | undefined) {
  if (value === 'captions_only' || value === 'subtitles_only') {
    return 'Nur Untertitel'
  }
  if (value === 'voice_and_silent') {
    return 'Voice + Silent'
  }
  return 'Voice + Untertitel'
}

function renderLaneLabel(value: string | undefined) {
  switch (value) {
    case 'fast':
      return 'Schnell'
    case 'quality':
      return 'Qualität'
    default:
      return 'Ausbalanciert'
  }
}

function renderProviderLabel(value: string | undefined) {
  switch (value) {
    case 'modal':
      return 'Modal zuerst'
    case 'nvidia':
      return 'Nur NVIDIA'
    case 'hybrid':
      return 'Hybrid'
    default:
      return 'Automatisch'
  }
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = await getAuthHeaders(init?.headers)
  const response = await fetch(url, {
    cache: 'no-store',
    ...init,
    headers,
  })
  if (!response.ok) {
    throw new Error(`request_failed:${response.status}`)
  }
  return response.json() as Promise<T>
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }
      reject(new Error('file_read_failed'))
    }
    reader.onerror = () => reject(new Error('file_read_failed'))
    reader.readAsDataURL(file)
  })
}

export default function AdminGeneratorPage() {
  const [products, setProducts] = useState<ProductItem[]>([])
  const [personAssets, setPersonAssets] = useState<PersonAsset[]>([])
  const [jobs, setJobs] = useState<JobListItem[]>([])
  const [postingQueue, setPostingQueue] = useState<PostingQueueItem[]>([])
  const [selectedProductID, setSelectedProductID] = useState('')
  const [selectedPersonAssetID, setSelectedPersonAssetID] = useState('')
  const [selectedRunID, setSelectedRunID] = useState('')
  const [runDetail, setRunDetail] = useState<RunDetail | null>(null)
  const [settings, setSettings] = useState<GeneratorSettings | null>(null)
  const [savingSettings, setSavingSettings] = useState(false)
  const [creatingRun, setCreatingRun] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [hookStyle, setHookStyle] = useState('authentisch')
  const [ctaStyle, setCTAStyle] = useState('ruhig-direkt')
  const [notes, setNotes] = useState('')

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductID) || null,
    [products, selectedProductID],
  )
  const loadDashboard = useCallback(async (preserveSelection = true) => {
    setIsRefreshing(true)
    setError(null)
    try {
      const [productsData, personData, jobsData, settingsData, postingQueueData] = await Promise.all([
        fetchJSON<ProductResponse>('/api/admin/products?limit=60&sort_by=updated_at&sort_order=desc'),
        fetchJSON<PersonAssetResponse>('/api/admin/ugc/assets/person?limit=24'),
        fetchJSON<JobsResponse>('/api/admin/ugc/jobs?limit=10'),
        fetchJSON<GeneratorSettings>('/api/admin/ugc/settings'),
        fetchJSON<PostingQueueResponse>('/api/admin/ugc/posting-queue?limit=8&channel=tiktok'),
      ])

      const nextProducts = productsData.data?.products || []
      const nextPersonAssets = personData.items || []
      const nextJobs = jobsData.items || []
      setProducts(nextProducts)
      setPersonAssets(nextPersonAssets)
      setJobs(nextJobs)
      setSettings(settingsData)
      setPostingQueue(postingQueueData.items || [])

      if (!preserveSelection && nextProducts[0]) {
        setSelectedProductID(nextProducts[0].id)
      }
      if (!preserveSelection && nextPersonAssets[0]) {
        setSelectedPersonAssetID(nextPersonAssets[0].id)
      }
      const activeRunID = preserveSelection ? selectedRunID : nextJobs[0]?.id
      if (activeRunID) {
        const detail = await fetchJSON<RunDetail>(`/api/admin/ugc/jobs/${activeRunID}`)
        setRunDetail(detail)
        setSelectedRunID(activeRunID)
      } else {
        setRunDetail(null)
        setSelectedRunID('')
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'generator_load_failed')
    } finally {
      setIsRefreshing(false)
    }
  }, [selectedRunID])

  useEffect(() => {
    void loadDashboard(false)
  }, [loadDashboard])

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadDashboard(true)
    }, 20_000)
    return () => window.clearInterval(timer)
  }, [loadDashboard])

  const activeRun = runDetail?.run || jobs.find((job) => job.id === selectedRunID) || null

  const saveSettings = async () => {
    if (!settings) {
      return
    }
    setSavingSettings(true)
    setNotice(null)
    setError(null)
    try {
      const updated = await fetchJSON<GeneratorSettings>('/api/admin/ugc/settings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(settings),
      })
      setSettings(updated)
      setNotice('Auto-Modus und Standardausgabe gespeichert.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'generator_settings_save_failed')
    } finally {
      setSavingSettings(false)
    }
  }

  const createRun = async () => {
    if (!selectedProductID || !selectedPersonAssetID) {
      setError('Bitte zuerst Person und Produkt auswählen.')
      return
    }
    setCreatingRun(true)
    setNotice(null)
    setError(null)
    try {
      const detail = await fetchJSON<RunDetail>('/api/admin/ugc/jobs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProductID,
          person_asset_id: selectedPersonAssetID,
          hook_style: hookStyle,
          cta_style: ctaStyle,
          notes,
        }),
      })
      setRunDetail(detail)
      if (detail.run?.id) {
        setSelectedRunID(detail.run.id)
      }
      setNotice('UGC-Lauf angestoßen. Die KI plant und erzeugt jetzt automatisch Varianten.')
      await loadDashboard(true)
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'generator_create_failed')
    } finally {
      setCreatingRun(false)
    }
  }

  const uploadPersonAsset = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    setUploading(true)
    setNotice(null)
    setError(null)
    try {
      const dataURL = await readFileAsDataURL(file)
      const asset = await fetchJSON<PersonAsset>('/api/admin/ugc/assets/person', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          label: file.name.replace(/\.[^.]+$/, ''),
          source_kind: 'upload',
          file_name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
          source_data_url: dataURL,
          preview_url: dataURL,
        }),
      })
      setSelectedPersonAssetID(asset.id)
      setNotice('Personenbild übernommen. Als Nächstes nur noch Produkt wählen und generieren.')
      await loadDashboard(true)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'person_asset_upload_failed')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const openRun = async (runID: string) => {
    setSelectedRunID(runID)
    setError(null)
    try {
      const detail = await fetchJSON<RunDetail>(`/api/admin/ugc/jobs/${runID}`)
      setRunDetail(detail)
    } catch (detailError) {
      setError(detailError instanceof Error ? detailError.message : 'generator_detail_failed')
    }
  }

  const retryRun = async (runID: string) => {
    setError(null)
    setNotice(null)
    try {
      const detail = await fetchJSON<RunDetail>(`/api/admin/ugc/jobs/${runID}/retry`, {
        method: 'POST',
      })
      setRunDetail(detail)
      setSelectedRunID(runID)
      setNotice('Lauf erneut gestartet.')
      await loadDashboard(true)
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : 'generator_retry_failed')
    }
  }

  const summary = [
    {
      label: 'Was macht das für mich?',
      value: 'UGC ohne Operator-Stress',
      text: 'Die Seite plant Hook, Bildsprache, Varianten und Ausgabeformat automatisch. Du wählst praktisch nur Person und Produkt.',
    },
    {
      label: 'Standardausgabe',
      value: outputPackLabel(settings?.default_output_pack),
      text: 'Das System erzeugt sofort eine starke Hauptversion und zusätzliche Stilvarianten im Hintergrund.',
    },
    {
      label: 'Aktueller Modus',
      value: settings?.enabled ? (settings.mode === 'auto' ? 'Vollautomatisch' : 'Manuell') : 'Deaktiviert',
      text: 'Wenn der Auto-Modus aktiv ist, kann der Generator passende Produkte selbstständig nachschieben.',
    },
  ]

  return (
    <main className="pb-10">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="section-eyebrow">UGC Generator</p>
          <h1 className="mt-2 text-4xl">Weniger klicken. Mehr verkaufsstarke Clips.</h1>
            <p className="mt-3 text-base text-brand-text-muted">
              Aus einem Personenbild und einem Produkt entsteht automatisch ein verkaufsfertiger UGC-Lauf. Du musst nicht in eine
              Kommandozentrale denken, sondern nur entscheiden: Wer zeigt das Produkt und welches Produkt soll in den Clip.
            </p>
          </div>
          <Button variant="outline" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => void loadDashboard(true)} isLoading={isRefreshing}>
            Neu laden
          </Button>
        </header>

        {error ? <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        {notice ? <p className="mb-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p> : null}
        {settings && !settings.enabled ? (
          <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Der Generator ist aktuell deaktiviert. Aktiviere ihn unten, damit manuelle Starts und der optionale Autopilot freigeschaltet werden.
          </p>
        ) : null}

        <section className="mb-6 grid gap-4 lg:grid-cols-3">
          {summary.map((item) => (
            <article key={item.label} className="panel p-5">
              <p className="text-sm text-brand-text-muted">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold text-brand-text">{item.value}</p>
              <p className="mt-2 text-sm text-brand-text-muted">{item.text}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.95fr]">
          <div className="space-y-6">
            <article className="panel-elevated overflow-hidden">
              <div className="border-b border-brand-border bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.18),transparent_42%),linear-gradient(145deg,rgba(255,255,255,0.96),rgba(245,242,235,0.72))] px-6 py-6">
                <div className="flex items-start gap-3">
                  <span className="rounded-full bg-black p-3 text-white">
                    <Wand2 className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-text-muted">3-Sekunden-Verständnis</p>
                    <h2 className="mt-1 text-3xl">1. Person wählen 2. Produkt wählen 3. Generieren</h2>
                    <p className="mt-2 max-w-2xl text-sm text-brand-text-muted">
                      Die KI übernimmt Hook, Storyline, Varianten, Voice und Untertitel. Expertenoptionen bleiben verfügbar, aber erst wenn du sie wirklich brauchst.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 px-6 py-6">
                <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                  <section className="rounded-2xl border border-brand-border bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-brand-text">Person für den Clip</p>
                        <p className="text-sm text-brand-text-muted">Bestehendes Bild wählen oder neues Foto hochladen.</p>
                      </div>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-brand-border bg-brand-surface px-4 py-2 text-sm font-semibold text-brand-text hover:border-brand-border-strong">
                        <UploadCloud className="h-4 w-4" />
                        Bild hochladen
                        <input type="file" accept="image/*" className="hidden" onChange={(event) => void uploadPersonAsset(event)} disabled={uploading} />
                      </label>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {personAssets.map((asset) => {
                        const preview = asset.preview_url || asset.image_url
                        const isSelected = asset.id === selectedPersonAssetID
                        return (
                          <button
                            key={asset.id}
                            type="button"
                            onClick={() => setSelectedPersonAssetID(asset.id)}
                            className={[
                              'rounded-2xl border p-3 text-left transition-all',
                              isSelected ? 'border-black bg-black text-white shadow-lg' : 'border-brand-border bg-white hover:border-brand-border-strong',
                            ].join(' ')}
                          >
                            <div className="aspect-[4/5] overflow-hidden rounded-xl bg-brand-bg-muted">
                              {preview ? <img src={preview} alt={asset.label} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm">Kein Bild</div>}
                            </div>
                            <p className="mt-3 font-semibold">{asset.label}{asset.is_default ? ' · Standard' : ''}</p>
                            <p className={['text-sm', isSelected ? 'text-white/75' : 'text-brand-text-muted'].join(' ')}>{asset.source_kind === 'upload' ? 'Hochgeladen' : 'Bibliothek'}</p>
                          </button>
                        )
                      })}
                      {personAssets.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-brand-border p-5 text-sm text-brand-text-muted">
                          Noch kein Personenbild vorhanden. Lade oben ein Bild hoch, damit die KI sofort loslegen kann.
                        </div>
                      ) : null}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-brand-border bg-white p-4">
                    <p className="text-sm font-semibold text-brand-text">Produkt für den Clip</p>
                    <p className="text-sm text-brand-text-muted">Die KI nutzt Produktname, Bild und Beschreibung automatisch.</p>

                    <select
                      value={selectedProductID}
                      onChange={(event) => setSelectedProductID(event.target.value)}
                      className="mt-4 w-full rounded-2xl border border-brand-border bg-white px-4 py-3 text-sm text-brand-text focus:border-brand-accent focus:outline-none"
                    >
                      <option value="">Produkt auswählen</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>

                    <div className="mt-4 rounded-2xl border border-brand-border bg-brand-surface px-4 py-4">
                      {selectedProduct ? (
                        <div className="space-y-3">
                          {selectedProduct.images?.[0] ? (
                            <div className="aspect-[4/3] overflow-hidden rounded-xl bg-brand-bg-muted">
                              <img src={selectedProduct.images[0]} alt={selectedProduct.name} className="h-full w-full object-cover" />
                            </div>
                          ) : null}
                          <div>
                            <p className="text-lg font-semibold text-brand-text">{selectedProduct.name}</p>
                            <p className="mt-1 text-sm text-brand-text-muted">{selectedProduct.description || 'Die Produktbeschreibung wird automatisch in einen UGC-Nutzen-Frame übersetzt.'}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex min-h-[12rem] items-center justify-center text-sm text-brand-text-muted">
                          Sobald du ein Produkt auswählst, zeigt die Seite den Nutzen-Context sofort an.
                        </div>
                      )}
                    </div>
                  </section>
                </div>

                <details className="rounded-2xl border border-brand-border bg-white px-4 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-brand-text">
                    Erweiterte Einstellungen nur wenn nötig
                    <ChevronDown className="h-4 w-4 text-brand-text-muted" />
                  </summary>
                  <div className="mt-4 grid gap-4 lg:grid-cols-3">
                    <Input label="Hook-Stil" value={hookStyle} onChange={(event) => setHookStyle(event.target.value)} hint="Beispiel: authentisch, neugierig, direkt" />
                    <Input label="CTA-Ton" value={ctaStyle} onChange={(event) => setCTAStyle(event.target.value)} hint="Beispiel: ruhig-direkt, social-proof, soft-sell" />
                    <Input label="Zusätzlicher Hinweis" value={notes} onChange={(event) => setNotes(event.target.value)} hint="Optional. Die KI nimmt das nur ergänzend auf." />
                  </div>
                </details>

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    size="lg"
                    leftIcon={<Sparkles className="h-4 w-4" />}
                    onClick={() => void createRun()}
                    isLoading={creatingRun}
                    disabled={!selectedProductID || !selectedPersonAssetID || !settings?.enabled}
                  >
                    Jetzt UGC generieren
                  </Button>
                  <div className="rounded-full border border-brand-border bg-brand-surface px-4 py-2 text-sm text-brand-text-muted">
                    Standard: {audioModeLabel(settings?.default_audio_mode)} · {settings?.default_aspect_ratio || '9:16'} · {renderLaneLabel(settings?.default_render_lane)}
                  </div>
                </div>
              </div>
            </article>

            <article className="panel p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-brand-text">Autopilot-Voreinstellung</p>
                  <p className="text-sm text-brand-text-muted">Hier steuerst du nur das Nötigste. Fachlogik bleibt im Hintergrund.</p>
                </div>
                <Button variant="outline" onClick={() => void saveSettings()} isLoading={savingSettings}>
                  Speichern
                </Button>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <label className="rounded-2xl border border-brand-border bg-white px-4 py-4">
                  <p className="text-sm font-semibold text-brand-text">Generator aktiv</p>
                  <p className="mt-1 text-sm text-brand-text-muted">Schaltet manuelle Starts und den optionalen Autopilot frei.</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-semibold text-brand-text">{settings?.enabled ? 'Aktiv' : 'Aus'}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(settings?.enabled)}
                      onChange={(event) => setSettings((current) => (current ? { ...current, enabled: event.target.checked } : current))}
                      className="h-5 w-5 rounded border-brand-border"
                    />
                  </div>
                </label>

                <label className="rounded-2xl border border-brand-border bg-white px-4 py-4">
                  <p className="text-sm font-semibold text-brand-text">Modus</p>
                  <select
                    value={settings?.mode || 'manual'}
                    onChange={(event) => setSettings((current) => (current ? { ...current, mode: event.target.value as GeneratorSettings['mode'] } : current))}
                    className="mt-2 w-full rounded-xl border border-brand-border bg-white px-4 py-3 text-sm"
                  >
                    <option value="manual">Nur manuell</option>
                    <option value="auto">Vollautomatisch</option>
                  </select>
                </label>

                <label className="rounded-2xl border border-brand-border bg-white px-4 py-4">
                  <p className="text-sm font-semibold text-brand-text">Standardausgabe</p>
                  <select
                    value={settings?.default_output_pack || 'hero_plus_3'}
                    onChange={(event) =>
                      setSettings((current) =>
                        current ? { ...current, default_output_pack: event.target.value as GeneratorSettings['default_output_pack'] } : current,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-brand-border bg-white px-4 py-3 text-sm"
                  >
                    <option value="single">1 Clip</option>
                    <option value="hero_plus_3">Hero + 3 Varianten</option>
                    <option value="pack_5">5 Varianten</option>
                  </select>
                </label>

                <label className="rounded-2xl border border-brand-border bg-white px-4 py-4">
                  <p className="text-sm font-semibold text-brand-text">Render-Lane</p>
                  <p className="mt-1 text-sm text-brand-text-muted">Schnell spart GPU-Zeit, Qualität mischt Bulk-Render mit Premium-Hero.</p>
                  <select
                    value={settings?.default_render_lane || 'balanced'}
                    onChange={(event) =>
                      setSettings((current) =>
                        current ? { ...current, default_render_lane: event.target.value as GeneratorSettings['default_render_lane'] } : current,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-brand-border bg-white px-4 py-3 text-sm"
                  >
                    <option value="fast">Schnell</option>
                    <option value="balanced">Ausbalanciert</option>
                    <option value="quality">Qualität</option>
                  </select>
                </label>

                <label className="rounded-2xl border border-brand-border bg-white px-4 py-4">
                  <p className="text-sm font-semibold text-brand-text">Render-Engine</p>
                  <p className="mt-1 text-sm text-brand-text-muted">Hybrid nutzt Modal für Masse und NVIDIA für den hochwertigen Hero-Pass.</p>
                  <select
                    value={settings?.preferred_render_provider || 'hybrid'}
                    onChange={(event) =>
                      setSettings((current) =>
                        current ? { ...current, preferred_render_provider: event.target.value as GeneratorSettings['preferred_render_provider'] } : current,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-brand-border bg-white px-4 py-3 text-sm"
                  >
                    <option value="auto">Automatisch</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="modal">Modal zuerst</option>
                    <option value="nvidia">Nur NVIDIA</option>
                  </select>
                </label>
              </div>

              <label className="mt-4 flex items-center justify-between rounded-2xl border border-brand-border bg-white px-4 py-4">
                <div>
                  <p className="text-sm font-semibold text-brand-text">Menschliche Prüfung erzwingen</p>
                  <p className="text-sm text-brand-text-muted">Nützlich, wenn neue Produktlinien zunächst nicht direkt live übernommen werden sollen.</p>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settings?.requires_human_review)}
                  onChange={(event) =>
                    setSettings((current) => (current ? { ...current, requires_human_review: event.target.checked } : current))
                  }
                  className="h-5 w-5 rounded border-brand-border"
                />
              </label>
            </article>
          </div>

          <div className="space-y-6">
            <article className="panel p-5">
              <div className="flex items-start gap-3">
                <span className="rounded-full bg-brand-bg-muted p-3 text-brand-text">
                  <ImagePlus className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-brand-text">Was passiert jetzt?</p>
                  <div className="mt-3 grid gap-3">
                    {[
                      'Person und Produkt werden zusammengeführt',
                      `Die KI plant Hook, Story und Varianten im Modus ${renderLaneLabel(settings?.default_render_lane).toLowerCase()}`,
                      `Bulk-Render läuft über ${renderProviderLabel(settings?.preferred_render_provider).toLowerCase()} und landet privat im Pool`,
                    ].map((step, index) => (
                      <div key={step} className="flex items-center gap-3 rounded-2xl border border-brand-border bg-white px-4 py-3 text-sm text-brand-text-muted">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-xs font-semibold text-white">{index + 1}</span>
                        {step}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>

            <article className="panel p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-brand-text">Privater Posting-Pool</p>
                  <p className="text-sm text-brand-text-muted">Fertige Clips liegen privat im Storage und werden nach dem Posting automatisch wieder entfernt.</p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {postingQueue.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-brand-border bg-white px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-brand-text">{item.product_name || 'UGC Clip'}{item.variant_label ? ` · ${item.variant_label}` : ''}</p>
                        <p className="text-sm text-brand-text-muted">
                          {item.channel?.toUpperCase() || 'TIKTOK'} · {item.delete_after_posted ? 'wird nach dem Post gelöscht' : 'bleibt gespeichert'}
                        </p>
                      </div>
                      <span className={['inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold', statusTone[item.status] || 'border-brand-border bg-brand-surface text-brand-text'].join(' ')}>
                        {prettyStatus(item.status)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-brand-text-muted">
                      {item.posted_at
                        ? `Gepostet am ${new Date(item.posted_at).toLocaleString('de-DE')}`
                        : item.scheduled_for
                          ? `Bereit seit ${new Date(item.scheduled_for).toLocaleString('de-DE')}`
                          : 'Bereit zum Claim durch den Posting-Agent'}
                    </p>
                  </div>
                ))}
                {postingQueue.length === 0 ? (
                  <p className="text-sm text-brand-text-muted">Sobald ein Live-Clip erfolgreich gespiegelt ist, erscheint er hier als privater Posting-Kandidat.</p>
                ) : null}
              </div>
            </article>

            <article className="panel p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-brand-text">Letzte Läufe</p>
                  <p className="text-sm text-brand-text-muted">Die KI hält den Verlauf aktuell. Ein Klick öffnet Details und Varianten.</p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {jobs.map((job) => {
                  const preview = job.hero_preview_url || job.person_preview_url
                  const selected = job.id === selectedRunID
                  return (
                    <button
                      key={job.id}
                      type="button"
                      onClick={() => void openRun(job.id)}
                      className={[
                        'flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all',
                        selected ? 'border-black bg-black text-white' : 'border-brand-border bg-white hover:border-brand-border-strong',
                      ].join(' ')}
                    >
                      <div className="h-16 w-16 overflow-hidden rounded-xl bg-brand-bg-muted">
                        {preview ? <img src={preview} alt={job.title} className="h-full w-full object-cover" /> : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{job.title || job.product_name || 'UGC Lauf'}</p>
                        <p className={['truncate text-sm', selected ? 'text-white/75' : 'text-brand-text-muted'].join(' ')}>
                          {job.person_label || 'Person'} · {job.product_name || 'Produkt'}
                        </p>
                        <p className={['mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold', statusTone[job.status] || 'border-brand-border bg-brand-surface text-brand-text'].join(' ')}>
                          {prettyStatus(job.status)}
                        </p>
                      </div>
                    </button>
                  )
                })}
                {jobs.length === 0 ? <p className="text-sm text-brand-text-muted">Noch kein Lauf vorhanden.</p> : null}
              </div>
            </article>

            <article className="panel p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-brand-text">Aktive Details</p>
                  <p className="text-sm text-brand-text-muted">Hier siehst du sofort, was die KI bereits für dich vorbereitet hat.</p>
                </div>
                {activeRun?.status === 'failed' && activeRun?.id ? (
                  <Button variant="outline" size="sm" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => void retryRun(activeRun.id)}>
                    Erneut versuchen
                  </Button>
                ) : null}
              </div>

              {activeRun ? (
                <div className="mt-4 space-y-4">
	                  <div className="rounded-2xl border border-brand-border bg-white p-4">
	                    <div className="flex flex-wrap items-center justify-between gap-3">
	                      <div>
	                        <p className="text-lg font-semibold text-brand-text">{activeRun.title || activeRun.product_name}</p>
	                        <p className="text-sm text-brand-text-muted">{activeRun.status_message || 'Der Lauf aktualisiert sich automatisch.'}</p>
	                      </div>
                      <span className={['inline-flex rounded-full border px-3 py-1 text-sm font-semibold', statusTone[activeRun.status] || 'border-brand-border bg-brand-surface text-brand-text'].join(' ')}>
                        {prettyStatus(activeRun.status)}
	                      </span>
	                    </div>
	                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
	                      <span className="rounded-full border border-brand-border bg-brand-surface px-3 py-1 text-brand-text-muted">
	                        Lane: {renderLaneLabel(String(runDetail?.run?.input_payload?.render_lane || settings?.default_render_lane || 'balanced'))}
	                      </span>
	                      <span className="rounded-full border border-brand-border bg-brand-surface px-3 py-1 text-brand-text-muted">
	                        Engine: {renderProviderLabel(String(runDetail?.run?.input_payload?.render_provider || settings?.preferred_render_provider || 'auto'))}
	                      </span>
	                    </div>
	                    {runDetail?.run?.last_error ? (
                      <div className="mt-4 flex gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
                        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <span>{runDetail.run.last_error}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-3">
                    {(runDetail?.variants || []).map((variant) => {
                      const preview = variant.preview_url || variant.thumbnail_url
                      return (
                        <article key={variant.id} className="rounded-2xl border border-brand-border bg-white p-4">
                          <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                            <div className="aspect-[9/16] overflow-hidden rounded-2xl bg-brand-bg-muted">
                              {preview ? <img src={preview} alt={variant.variant_label} className="h-full w-full object-cover" /> : null}
                            </div>
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-lg font-semibold text-brand-text">{variant.variant_label}</p>
                                <span className={['inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold', statusTone[activeRun.status] || 'border-brand-border bg-brand-surface text-brand-text'].join(' ')}>
                                  {variant.variant_role === 'hero' ? 'Hero' : 'Variante'}
                                </span>
                              </div>
                              <p className="text-sm text-brand-text-muted">{variant.subtitle_text || 'Noch keine Untertitel vorhanden.'}</p>
                              <div className="rounded-2xl border border-brand-border bg-brand-surface px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-text-muted">Hook / Sprechertext</p>
                                <p className="mt-2 text-sm text-brand-text">{variant.script_text || 'Die KI bereitet gerade den Text vor.'}</p>
                              </div>
                              {variant.video_url ? (
                                <a
                                  href={variant.video_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex rounded-full border border-brand-border bg-white px-4 py-2 text-sm font-semibold text-brand-text hover:border-brand-border-strong"
                                >
                                  Video öffnen
                                </a>
                              ) : (
                                <p className="text-xs text-brand-text-muted">
                                  Wenn hier noch kein Video-Link erscheint, ist entweder noch Rendering aktiv oder der Lauf liefert zunächst ein Konzept-Set.
                                </p>
                              )}
                            </div>
                          </div>
                        </article>
                      )
                    })}
                    {(runDetail?.variants || []).length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-brand-border px-4 py-8 text-sm text-brand-text-muted">
                        Sobald ein Lauf geöffnet ist, erscheinen hier Hero-Clip und Varianten.
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-brand-border px-4 py-8 text-sm text-brand-text-muted">
                  Noch kein Lauf ausgewählt. Starte links einen UGC-Lauf oder öffne einen vorhandenen Eintrag aus dem Verlauf.
                </div>
              )}
            </article>
          </div>
        </section>
    </main>
  )
}
