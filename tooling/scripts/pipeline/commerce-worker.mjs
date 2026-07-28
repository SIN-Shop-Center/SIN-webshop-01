#!/usr/bin/env node
/**
 * Local commerce worker.
 *
 * Claims jobs atomically from public.queue_jobs and executes an allowlisted
 * stage implementation. Payloads can never inject shell commands.
 *
 * Usage:
 *   node tooling/scripts/pipeline/commerce-worker.mjs --once
 *   node tooling/scripts/pipeline/commerce-worker.mjs
 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { hasFlag, loadLocalEnvFiles } from '../lib/cli-env.mjs'

loadLocalEnvFiles()

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const WORKER_ID = `${os.hostname()}:commerce:${process.pid}`
const QUEUE = 'commerce-autopilot'
const ONCE = hasFlag('--once')
const POLL_MS = Math.max(5_000, Number(process.env.COMMERCE_WORKER_POLL_MS ?? 15_000))
const MAX_OUTPUT_CHARS = 40_000

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
}

const control = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
  db: { schema: 'public' },
})

const PIPELINE_STAGES = [
  'trend.scan',
  'cj.rank',
  'product.enrich',
  'creative.generate',
  'shop.publish',
  'tiktok.publish',
  'social.prepare',
]

const STAGE_COMMANDS = {
  'trend.scan': ['node', ['tooling/scripts/pipeline/trend-intelligence.mjs']],
  'cj.rank': ['node', ['tooling/scripts/pipeline/select-top-cj-products.mjs']],
  'product.enrich': ['node', ['tooling/scripts/pipeline/enrich-products.mjs']],
  'creative.generate': ['node', ['tooling/scripts/pipeline/openmontage-shop-bridge.mjs']],
  'shop.publish': ['node', ['tooling/scripts/pipeline/publish-approved-products.mjs']],
  'social.prepare': ['node', ['tooling/scripts/pipeline/prepare-social-drafts.mjs']],
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function trimOutput(value) {
  const text = String(value || '')
  return text.length <= MAX_OUTPUT_CHARS ? text : text.slice(-MAX_OUTPUT_CHARS)
}

async function claimJob() {
  const { data, error } = await control.rpc('dequeue_jobs', {
    p_queue_name: QUEUE,
    p_limit: 1,
    p_worker: WORKER_ID,
  })
  if (error) throw error
  return data?.[0] ?? null
}

async function createPipelineRun(job, runType) {
  const { data, error } = await control
    .from('commerce_pipeline_runs')
    .insert({
      run_type: runType,
      status: 'running',
      source: job.payload?.requested_from || 'worker',
      requested_payload: {
        queue_job_id: job.id,
        job_type: job.job_type,
        ...job.payload,
      },
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

async function createStageRun(pipelineRunId, queueJobId, stage, inputPayload) {
  const { data, error } = await control
    .from('commerce_pipeline_stage_runs')
    .insert({
      pipeline_run_id: pipelineRunId,
      queue_job_id: queueJobId,
      stage,
      status: 'running',
      input_payload: inputPayload ?? {},
      attempt_count: 1,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

async function completeStage(stageRunId, result) {
  const { error } = await control
    .from('commerce_pipeline_stage_runs')
    .update({
      status: 'completed',
      output_payload: result,
      duration_ms: result.duration_ms,
      completed_at: new Date().toISOString(),
    })
    .eq('id', stageRunId)
  if (error) throw error
}

async function failStage(stageRunId, error, durationMs) {
  await control
    .from('commerce_pipeline_stage_runs')
    .update({
      status: 'failed',
      last_error: error instanceof Error ? error.message : String(error),
      duration_ms: durationMs,
      completed_at: new Date().toISOString(),
    })
    .eq('id', stageRunId)
}

async function runProcess(command, args, extraEnv = {}) {
  const started = Date.now()
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      env: { ...process.env, ...extraEnv },
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => {
      stdout = trimOutput(stdout + chunk.toString())
      process.stdout.write(chunk)
    })
    child.stderr.on('data', (chunk) => {
      stderr = trimOutput(stderr + chunk.toString())
      process.stderr.write(chunk)
    })
    child.on('error', reject)
    child.on('close', (code, signal) => {
      const result = {
        command: `${command} ${args.join(' ')}`,
        exit_code: code,
        signal,
        stdout: trimOutput(stdout),
        stderr: trimOutput(stderr),
        duration_ms: Date.now() - started,
      }
      if (code === 0) resolve(result)
      else {
        const error = new Error(
          `${result.command} failed with exit ${code}${stderr ? `: ${trimOutput(stderr)}` : ''}`,
        )
        error.result = result
        reject(error)
      }
    })
  })
}

async function runTikTokPublish() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  const secret = process.env.CRON_SECRET
  if (!baseUrl || !secret) {
    throw new Error('NEXT_PUBLIC_APP_URL and CRON_SECRET are required for TikTok publishing')
  }
  const started = Date.now()
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/cron/tiktok-publish`, {
    headers: { authorization: `Bearer ${secret}` },
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`TikTok publish route returned ${response.status}: ${text}`)

  const contentUpload = await runProcess(
    'node',
    ['tooling/scripts/pipeline/upload-approved-tiktok-videos.mjs'],
  )
  return {
    shop_listing: {
      endpoint: '/api/cron/tiktok-publish',
      status: response.status,
      response: trimOutput(text),
    },
    content_draft_upload: contentUpload,
    duration_ms: Date.now() - started,
  }
}

async function executeStage(stage, pipelineRunId, queueJobId, payload = {}) {
  if (!PIPELINE_STAGES.includes(stage)) throw new Error(`Stage not allowed: ${stage}`)
  const stageRunId = await createStageRun(pipelineRunId, queueJobId, stage, payload)
  const started = Date.now()
  try {
    const result = stage === 'tiktok.publish'
      ? await runTikTokPublish()
      : await runProcess(STAGE_COMMANDS[stage][0], STAGE_COMMANDS[stage][1], {
          COMMERCE_PIPELINE_RUN_ID: pipelineRunId,
          COMMERCE_STAGE_RUN_ID: stageRunId,
        })
    await completeStage(stageRunId, result)
    return result
  } catch (error) {
    await failStage(stageRunId, error, Date.now() - started)
    throw error
  }
}

async function markPipelineRun(pipelineRunId, status, summary = {}, lastError = null) {
  const { error } = await control
    .from('commerce_pipeline_runs')
    .update({
      status,
      result_summary: summary,
      last_error: lastError,
      completed_at: new Date().toISOString(),
    })
    .eq('id', pipelineRunId)
  if (error) throw error
}

async function markJobCompleted(job, result) {
  const { error } = await control
    .from('queue_jobs')
    .update({
      status: 'completed',
      locked_at: null,
      locked_by: null,
      last_error: null,
      payload: { ...job.payload, result },
    })
    .eq('id', job.id)
  if (error) throw error
}

async function markJobFailed(job, error) {
  const message = error instanceof Error ? error.message : String(error)
  const exhausted = Number(job.attempt_count) >= Number(job.max_attempts)
  if (exhausted) {
    const { error: deadError } = await control.from('queue_dead_letter').insert({
      queue_job_id: job.id,
      queue_name: QUEUE,
      job_type: job.job_type,
      payload: job.payload ?? {},
      reason: message,
    })
    if (deadError) console.error('Could not write dead letter:', deadError.message)
  }

  const retryDelayMinutes = Math.min(60, 2 ** Math.max(1, Number(job.attempt_count)))
  const { error: updateError } = await control
    .from('queue_jobs')
    .update({
      status: exhausted ? 'dead' : 'pending',
      available_at: exhausted
        ? new Date().toISOString()
        : new Date(Date.now() + retryDelayMinutes * 60_000).toISOString(),
      locked_at: null,
      locked_by: null,
      last_error: message,
    })
    .eq('id', job.id)
  if (updateError) throw updateError
}

async function processJob(job) {
  const isDaily = job.job_type === 'pipeline.daily'
  const stages = isDaily ? PIPELINE_STAGES : [job.job_type]
  if (!stages.every((stage) => PIPELINE_STAGES.includes(stage))) {
    throw new Error(`Unsupported commerce job type: ${job.job_type}`)
  }

  const pipelineRunId = await createPipelineRun(job, isDaily ? 'daily' : 'single_stage')
  const results = {}
  try {
    for (const stage of stages) {
      console.log(`\n[${pipelineRunId}] Starting ${stage}`)
      results[stage] = await executeStage(stage, pipelineRunId, job.id, job.payload)
    }
    await markPipelineRun(pipelineRunId, 'completed', results)
    await markJobCompleted(job, { pipeline_run_id: pipelineRunId, stages: Object.keys(results) })
  } catch (error) {
    const status = Object.keys(results).length ? 'partial' : 'failed'
    await markPipelineRun(
      pipelineRunId,
      status,
      results,
      error instanceof Error ? error.message : String(error),
    )
    await markJobFailed(job, error)
    throw error
  }
}

async function tick() {
  const job = await claimJob()
  if (!job) return false
  console.log(`Claimed ${job.job_type} (${job.id}) as ${WORKER_ID}`)
  try {
    await processJob(job)
    console.log(`Completed ${job.job_type} (${job.id})`)
  } catch (error) {
    console.error(`Failed ${job.job_type} (${job.id}):`, error)
  }
  return true
}

async function main() {
  console.log(`Commerce worker ${WORKER_ID} started (${ONCE ? 'once' : `${POLL_MS}ms poll`})`)
  if (ONCE) {
    await tick()
    return
  }

  for (;;) {
    try {
      const processed = await tick()
      if (!processed) await sleep(POLL_MS)
    } catch (error) {
      console.error('Worker loop error:', error)
      await sleep(POLL_MS)
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
