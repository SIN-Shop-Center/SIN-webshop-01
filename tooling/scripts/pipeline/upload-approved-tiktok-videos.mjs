#!/usr/bin/env node
/**
 * Upload approved OpenMontage renders to the TikTok user's inbox as drafts.
 *
 * This uses TikTok Content Posting API / video.upload. It never direct-posts.
 * The authorized TikTok user must review/edit/publish from the TikTok inbox.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { createClient } from '@supabase/supabase-js'
import { loadLocalEnvFiles } from '../lib/cli-env.mjs'

loadLocalEnvFiles()

const ENABLED = String(process.env.TIKTOK_CONTENT_UPLOAD_ENABLED || '').toLowerCase() === 'true'
const ACCESS_TOKEN = process.env.TIKTOK_CONTENT_USER_ACCESS_TOKEN || ''
const API_BASE = 'https://open.tiktokapis.com'
const OPENMONTAGE_ROOT = path.resolve(process.env.OPENMONTAGE_ROOT || '/Users/jeremy/dev/OpenMontage')
const MAX_VIDEO_BYTES = 4 * 1024 * 1024 * 1024
const MULTI_CHUNK_SIZE = 32 * 1024 * 1024
const SINGLE_CHUNK_MAX = 64 * 1024 * 1024
const DAILY_LIMIT = Math.max(1, Math.min(5, Number(process.env.TIKTOK_CONTENT_DAILY_LIMIT ?? 5)))

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceKey) {
  throw new Error('Supabase service-role configuration is required')
}

const shop = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
  db: { schema: 'shop' },
})
const control = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
  db: { schema: 'public' },
})

function contentTypeFor(filePath) {
  const extension = path.extname(filePath).toLowerCase()
  if (extension === '.mp4') return 'video/mp4'
  if (extension === '.mov') return 'video/quicktime'
  if (extension === '.webm') return 'video/webm'
  throw new Error(`Unsupported TikTok video extension: ${extension || '(none)'}`)
}

function chunkPlan(size) {
  if (size <= SINGLE_CHUNK_MAX) {
    return { chunkSize: size, totalChunkCount: 1 }
  }
  const totalChunkCount = Math.floor(size / MULTI_CHUNK_SIZE)
  if (totalChunkCount < 2) throw new Error('Invalid multi-chunk plan')
  if (totalChunkCount > 1000) throw new Error('Video would exceed TikTok chunk-count limit')
  return { chunkSize: MULTI_CHUNK_SIZE, totalChunkCount }
}

async function tiktokJson(endpoint, body) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${ACCESS_TOKEN}`,
      'content-type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify(body),
  })
  const payload = await response.json()
  if (!response.ok || payload.error?.code !== 'ok') {
    throw new Error(
      `TikTok ${endpoint} failed (${response.status}): ${payload.error?.code || 'unknown'} ${payload.error?.message || ''}`.trim(),
    )
  }
  return payload.data
}

async function initializeUpload({ size, chunkSize, totalChunkCount }) {
  return tiktokJson('/v2/post/publish/inbox/video/init/', {
    source_info: {
      source: 'FILE_UPLOAD',
      video_size: size,
      chunk_size: chunkSize,
      total_chunk_count: totalChunkCount,
    },
  })
}

async function fetchUploadStatus(publishId) {
  return tiktokJson('/v2/post/publish/status/fetch/', { publish_id: publishId })
}

async function uploadChunks({ uploadUrl, filePath, size, contentType, chunkSize, totalChunkCount, onProgress }) {
  const handle = await fs.open(filePath, 'r')
  let offset = 0
  try {
    for (let index = 0; index < totalChunkCount; index += 1) {
      const isLast = index === totalChunkCount - 1
      const length = isLast ? size - offset : chunkSize
      const buffer = Buffer.allocUnsafe(length)
      const { bytesRead } = await handle.read(buffer, 0, length, offset)
      if (bytesRead !== length) {
        throw new Error(`Unexpected EOF at byte ${offset}: expected ${length}, got ${bytesRead}`)
      }
      const lastByte = offset + length - 1
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'content-type': contentType,
          'content-length': String(length),
          'content-range': `bytes ${offset}-${lastByte}/${size}`,
        },
        body: buffer,
      })
      if (!response.ok) {
        const body = await response.text()
        throw new Error(`TikTok chunk ${index + 1}/${totalChunkCount} failed (${response.status}): ${body}`)
      }
      offset += length
      await onProgress(offset)
    }
  } finally {
    await handle.close()
  }
  return offset
}

function mapRemoteStatus(value) {
  const status = String(value || '').toUpperCase()
  if (status.includes('FAIL')) return 'failed'
  if (status.includes('PUBLISH_COMPLETE') || status.includes('POSTED')) return 'published'
  if (status.includes('INBOX') || status.includes('READY')) return 'ready_in_inbox'
  return 'processing'
}

async function safeRenderPath(renderPath) {
  const [rootRealPath, fileRealPath] = await Promise.all([
    fs.realpath(OPENMONTAGE_ROOT),
    fs.realpath(renderPath),
  ])
  if (!fileRealPath.startsWith(`${rootRealPath}${path.sep}`)) {
    throw new Error('Render path is outside the configured OpenMontage root')
  }
  return fileRealPath
}

async function remainingDailySlots() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count, error } = await control
    .from('tiktok_content_uploads')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since)
    .in('status', ['initializing', 'uploading', 'uploaded', 'processing', 'ready_in_inbox', 'published'])
  if (error) throw error
  return Math.max(0, DAILY_LIMIT - Number(count || 0))
}

async function eligibleCreativeJobs(limit) {
  const { data, error } = await control
    .from('commerce_creative_jobs')
    .select('id, product_id, project_id, render_path, status, approval_state, updated_at')
    .eq('status', 'approved')
    .eq('approval_state', 'assets_approved')
    .not('render_path', 'is', null)
    .order('updated_at', { ascending: true })
    .limit(Math.max(limit * 3, 10))
  if (error) throw error

  const eligible = []
  for (const job of data || []) {
    const { data: existing, error: existingError } = await control
      .from('tiktok_content_uploads')
      .select('id, status')
      .eq('creative_job_id', job.id)
      .maybeSingle()
    if (existingError) throw existingError
    if (existing && !['failed', 'cancelled'].includes(existing.status)) continue

    const { data: product, error: productError } = await shop
      .from('products')
      .select('id, name, title_de, is_active, pipeline_state, approval_state, creative_status, tiktok_product_id')
      .eq('id', job.product_id)
      .maybeSingle()
    if (productError) throw productError
    if (!product) continue
    if (!product.is_active || product.pipeline_state !== 'published') continue
    if (product.approval_state !== 'approved' || product.creative_status !== 'approved') continue
    if (!product.tiktok_product_id) continue

    eligible.push({ ...job, product })
    if (eligible.length >= limit) break
  }
  return eligible
}

async function createOrResetLedger(job, renderPath, contentType, size) {
  const { data, error } = await control
    .from('tiktok_content_uploads')
    .upsert({
      product_id: job.product_id,
      creative_job_id: job.id,
      render_path: renderPath,
      content_type: contentType,
      file_size_bytes: size,
      uploaded_bytes: 0,
      status: 'initializing',
      status_payload: {},
      last_error: null,
      initialized_at: null,
      uploaded_at: null,
      completed_at: null,
    }, { onConflict: 'creative_job_id' })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

async function uploadJob(job) {
  let ledgerId = null
  try {
    const renderPath = await safeRenderPath(job.render_path)
    const stat = await fs.stat(renderPath)
    if (!stat.isFile() || stat.size <= 0) throw new Error('Render is not a readable non-empty file')
    if (stat.size > MAX_VIDEO_BYTES) throw new Error('Render exceeds TikTok 4 GB limit')
    const contentType = contentTypeFor(renderPath)
    const { chunkSize, totalChunkCount } = chunkPlan(stat.size)
    ledgerId = await createOrResetLedger(job, renderPath, contentType, stat.size)

    const init = await initializeUpload({ size: stat.size, chunkSize, totalChunkCount })
    if (!init?.publish_id || !init?.upload_url) throw new Error('TikTok upload init returned no publish_id/upload_url')

    const initializedAt = new Date().toISOString()
    await control
      .from('tiktok_content_uploads')
      .update({
        publish_id: init.publish_id,
        status: 'uploading',
        initialized_at: initializedAt,
        status_payload: { init: { publish_id: init.publish_id }, chunk_size: chunkSize, total_chunk_count: totalChunkCount },
      })
      .eq('id', ledgerId)

    const uploadedBytes = await uploadChunks({
      uploadUrl: init.upload_url,
      filePath: renderPath,
      size: stat.size,
      contentType,
      chunkSize,
      totalChunkCount,
      onProgress: async (bytes) => {
        const { error } = await control
          .from('tiktok_content_uploads')
          .update({ uploaded_bytes: bytes, status: bytes === stat.size ? 'uploaded' : 'uploading' })
          .eq('id', ledgerId)
        if (error) throw error
      },
    })

    let remoteStatus = null
    try {
      remoteStatus = await fetchUploadStatus(init.publish_id)
    } catch (statusError) {
      remoteStatus = { status_check_error: statusError.message }
    }
    const mappedStatus = remoteStatus?.status ? mapRemoteStatus(remoteStatus.status) : 'uploaded'
    const now = new Date().toISOString()
    const { error: updateError } = await control
      .from('tiktok_content_uploads')
      .update({
        uploaded_bytes: uploadedBytes,
        status: mappedStatus,
        status_payload: { remote: remoteStatus, publish_id: init.publish_id },
        uploaded_at: now,
        completed_at: ['ready_in_inbox', 'published'].includes(mappedStatus) ? now : null,
        last_error: null,
      })
      .eq('id', ledgerId)
    if (updateError) throw updateError

    return {
      creative_job_id: job.id,
      product_id: job.product_id,
      publish_id: init.publish_id,
      status: mappedStatus,
      bytes: uploadedBytes,
    }
  } catch (error) {
    if (ledgerId) {
      await control
        .from('tiktok_content_uploads')
        .update({ status: 'failed', last_error: error.message })
        .eq('id', ledgerId)
    }
    throw error
  }
}

async function main() {
  if (!ENABLED) {
    console.log(JSON.stringify({ skipped: true, reason: 'TIKTOK_CONTENT_UPLOAD_ENABLED is not true' }))
    return
  }
  if (!ACCESS_TOKEN) {
    throw new Error('TIKTOK_CONTENT_USER_ACCESS_TOKEN is required when content upload is enabled')
  }

  const slots = await remainingDailySlots()
  if (slots <= 0) {
    console.log(JSON.stringify({ skipped: true, reason: 'Conservative 24-hour upload limit reached', daily_limit: DAILY_LIMIT }))
    return
  }

  const jobs = await eligibleCreativeJobs(slots)
  const uploaded = []
  const failed = []
  for (const job of jobs) {
    try {
      uploaded.push(await uploadJob(job))
    } catch (error) {
      failed.push({ creative_job_id: job.id, product_id: job.product_id, error: error.message })
    }
  }

  const report = {
    enabled: true,
    draft_upload_only: true,
    available_slots: slots,
    eligible: jobs.length,
    uploaded,
    failed,
  }
  console.log(JSON.stringify(report, null, 2))
  if (jobs.length && !uploaded.length) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
