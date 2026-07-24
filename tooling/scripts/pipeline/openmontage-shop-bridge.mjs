#!/usr/bin/env node
/**
 * Creates governed OpenMontage project handoffs for enriched ShopSIN products.
 *
 * OpenMontage is agent-first: this script prepares canonical project workspaces,
 * preserves evidence and creative constraints, and records an approval gate. It
 * does not pretend a render exists before an OpenMontage agent has executed and
 * passed final_review.
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { createClient } from '@supabase/supabase-js'
import { loadLocalEnvFiles } from '../lib/cli-env.mjs'

loadLocalEnvFiles()

const ROOT = process.cwd()
const INPUT_FILE = path.join(ROOT, 'data', 'pipeline', 'enriched-products.json')
const OUTPUT_FILE = path.join(ROOT, 'data', 'pipeline', 'creative-handoffs.json')
const OPENMONTAGE_ROOT = path.resolve(
  process.env.OPENMONTAGE_ROOT || '/Users/jeremy/dev/OpenMontage',
)
const PIPELINE_RUN_ID = process.env.COMMERCE_PIPELINE_RUN_ID || null
const MAX_PRODUCTS = Math.max(1, Math.min(20, Number(process.env.CREATIVE_PRODUCT_LIMIT ?? 10)))

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

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

function formatDate() {
  return new Date().toISOString().slice(0, 10).replaceAll('-', '')
}

function markdownList(values, empty = 'Noch nicht vorhanden') {
  if (!Array.isArray(values) || !values.length) return `- ${empty}`
  return values.map((value) => `- ${String(value)}`).join('\n')
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function readJsonMaybe(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    throw error
  }
}

async function resolveArtifact(projectPath, value) {
  if (!value) return null
  if (typeof value === 'object') return value
  if (typeof value !== 'string') return null
  const artifactPath = path.isAbsolute(value) ? value : path.join(projectPath, value)
  return readJsonMaybe(artifactPath)
}

function absoluteProjectPath(projectPath, value) {
  if (!value || typeof value !== 'string') return null
  return path.isAbsolute(value) ? value : path.join(projectPath, value)
}

const CHECKPOINT_STAGE_ORDER = [
  'research',
  'proposal',
  'script',
  'scene_plan',
  'assets',
  'edit',
  'compose',
  'publish',
]

function compactArtifact(stage, artifact) {
  if (!artifact || typeof artifact !== 'object' || Array.isArray(artifact)) return null

  if (stage === 'proposal') {
    return {
      concept_options: (artifact.concept_options || []).map((concept) => ({
        id: concept.id,
        title: concept.title,
        hook: concept.hook,
        narrative_structure: concept.narrative_structure,
        visual_approach: concept.visual_approach,
        target_duration_seconds: concept.target_duration_seconds,
        why_this_works: concept.why_this_works,
      })),
      selected_concept: artifact.selected_concept?.concept_id || null,
      production_plan: artifact.production_plan
        ? {
            quality_tier: artifact.production_plan.quality_tier,
            delivery_kind: artifact.production_plan.delivery_kind,
            motion_expectation: artifact.production_plan.motion_expectation,
            renderer_family: artifact.production_plan.renderer_family,
            render_runtime: artifact.production_plan.render_runtime,
            composition_mode: artifact.production_plan.composition_mode,
            art_direction: artifact.production_plan.art_direction || null,
            voice_selection: artifact.production_plan.voice_selection || null,
            music_source: artifact.production_plan.music_source || null,
            quality_tradeoffs: artifact.production_plan.quality_tradeoffs || [],
          }
        : null,
      cost_estimate: artifact.cost_estimate || null,
      approval: artifact.approval || null,
    }
  }

  if (stage === 'script') {
    return {
      title: artifact.title,
      total_duration_seconds: artifact.total_duration_seconds,
      voice_performance: artifact.voice_performance || null,
      sections: (artifact.sections || []).map((section) => ({
        id: section.id,
        label: section.label || null,
        text: section.text,
        start_seconds: section.start_seconds,
        end_seconds: section.end_seconds,
        source_ref: section.source_ref || null,
      })),
    }
  }

  if (stage === 'scene_plan') {
    return {
      quality_tier: artifact.quality_tier,
      delivery_kind: artifact.delivery_kind,
      motion_expectation: artifact.motion_expectation,
      scene_count: Array.isArray(artifact.scenes) ? artifact.scenes.length : 0,
      scenes: (artifact.scenes || []).map((scene) => ({
        id: scene.id,
        type: scene.type,
        description: scene.description,
        start_seconds: scene.start_seconds,
        end_seconds: scene.end_seconds,
        spoken_phrase: scene.spoken_phrase || null,
        visual_action: scene.visual_action,
        semantic_purpose: scene.semantic_purpose,
        motion_class: scene.motion_class,
      })),
    }
  }

  if (stage === 'assets') {
    return {
      total_cost_usd: artifact.total_cost_usd || 0,
      asset_count: Array.isArray(artifact.assets) ? artifact.assets.length : 0,
      assets: (artifact.assets || []).map((asset) => ({
        id: asset.id,
        type: asset.type,
        path: asset.path,
        source_tool: asset.source_tool,
        provider: asset.provider || null,
        model: asset.model || null,
        cost_usd: asset.cost_usd || 0,
        scene_id: asset.scene_id,
        quality_score: asset.quality_score ?? null,
      })),
    }
  }

  if (stage === 'compose') {
    return {
      status: artifact.status || null,
      output_path: artifact.output_path || null,
      duration_seconds: artifact.duration_seconds || null,
      resolution: artifact.resolution || null,
      runtime: artifact.render_runtime || artifact.runtime || null,
      total_cost_usd: artifact.total_cost_usd || 0,
    }
  }

  if (stage === 'publish') {
    return {
      entries: artifact.entries || [],
      metadata: artifact.metadata || {},
    }
  }

  const keys = Object.keys(artifact).slice(0, 20)
  return Object.fromEntries(keys.map((key) => [key, artifact[key]]))
}

async function collectCheckpointSummary(projectPath) {
  let files = []
  try {
    files = await fs.readdir(projectPath)
  } catch {
    return { checkpoints: [], open_gate: null, latest_stage: null }
  }

  const checkpoints = []
  for (const file of files.filter((entry) => /^checkpoint_.+\.json$/.test(entry))) {
    const checkpoint = await readJsonMaybe(path.join(projectPath, file))
    if (!checkpoint?.stage) continue

    const canonicalName = {
      research: 'research_brief',
      proposal: 'proposal_packet',
      script: 'script',
      scene_plan: 'scene_plan',
      assets: 'asset_manifest',
      edit: 'edit_decisions',
      compose: 'render_report',
      publish: 'publish_log',
    }[checkpoint.stage]
    const artifactRef = canonicalName ? checkpoint.artifacts?.[canonicalName] : null
    const artifact = await resolveArtifact(projectPath, artifactRef)
    const finalReview = checkpoint.stage === 'compose'
      ? await resolveArtifact(projectPath, checkpoint.artifacts?.final_review)
      : null

    checkpoints.push({
      stage: checkpoint.stage,
      status: checkpoint.status,
      timestamp: checkpoint.timestamp || null,
      human_approval_required: Boolean(checkpoint.human_approval_required),
      human_approved: Boolean(checkpoint.human_approved),
      artifact_names: Object.keys(checkpoint.artifacts || {}),
      artifact_preview: compactArtifact(checkpoint.stage, artifact),
      review: checkpoint.review || null,
      cost_snapshot: checkpoint.cost_snapshot || null,
      final_review: finalReview
        ? {
            status: finalReview.status || null,
            summary: finalReview.summary || null,
            blockers: finalReview.blockers || finalReview.critical_findings || [],
            output_path: finalReview.output_path || null,
          }
        : null,
      control_plane_decision:
        checkpoint.metadata?.commerce_control_plane_approval?.decision || null,
      control_plane_feedback:
        checkpoint.metadata?.commerce_control_plane_approval?.feedback || null,
    })
  }

  checkpoints.sort((a, b) => {
    const left = CHECKPOINT_STAGE_ORDER.indexOf(a.stage)
    const right = CHECKPOINT_STAGE_ORDER.indexOf(b.stage)
    return (left < 0 ? 999 : left) - (right < 0 ? 999 : right)
  })
  const openGate = checkpoints.find((checkpoint) => (
    checkpoint.status === 'awaiting_human' && checkpoint.human_approved !== true
  )) || null
  const latestStage = checkpoints.at(-1)?.stage || null

  return { checkpoints, open_gate: openGate, latest_stage: latestStage }
}

async function syncCreativeJob(job) {
  const checkpointSummary = await collectCheckpointSummary(job.project_path)
  const composeCheckpoint = await readJsonMaybe(path.join(job.project_path, 'checkpoint_compose.json'))
  if (!composeCheckpoint || composeCheckpoint.status !== 'completed') {
    const { error } = await control
      .from('commerce_creative_jobs')
      .update({
        status: checkpointSummary.open_gate ? 'awaiting_approval' : job.status,
        output_payload: {
          ...(job.output_payload || {}),
          checkpoint_summary: checkpointSummary,
          checkpoint_synced_at: new Date().toISOString(),
        },
      })
      .eq('id', job.id)
    if (error) throw error
    return checkpointSummary.checkpoints.length
      ? {
          job_id: job.id,
          project_id: job.project_id,
          status: checkpointSummary.open_gate ? 'awaiting_approval' : job.status,
          open_gate: checkpointSummary.open_gate?.stage || null,
        }
      : null
  }

  const finalReview = await resolveArtifact(job.project_path, composeCheckpoint.artifacts?.final_review)
  const renderReport = await resolveArtifact(job.project_path, composeCheckpoint.artifacts?.render_report)
  if (!finalReview) return null

  if (finalReview.status !== 'pass') {
    const message = `OpenMontage final_review=${finalReview.status}`
    await control
      .from('commerce_creative_jobs')
      .update({
        status: finalReview.status === 'fail' ? 'failed' : 'qa_review',
        approval_state: 'awaiting_asset_review',
        output_payload: {
          ...(job.output_payload || {}),
          checkpoint_summary: checkpointSummary,
          compose_checkpoint: composeCheckpoint,
          final_review: finalReview,
          render_report: renderReport,
        },
        last_error: finalReview.status === 'fail' ? message : null,
      })
      .eq('id', job.id)
    await shop
      .from('products')
      .update({ creative_status: finalReview.status === 'fail' ? 'failed' : 'review' })
      .eq('id', job.product_id)
    return { job_id: job.id, project_id: job.project_id, status: finalReview.status }
  }

  const renderPath = absoluteProjectPath(job.project_path, finalReview.output_path)
  if (!renderPath || !(await fileExists(renderPath))) {
    throw new Error(`Final review passed but render file is missing for ${job.project_id}`)
  }

  const publishCheckpoint = await readJsonMaybe(path.join(job.project_path, 'checkpoint_publish.json'))
  const publishLog = publishCheckpoint
    ? await resolveArtifact(job.project_path, publishCheckpoint.artifacts?.publish_log)
    : null
  const humanApproved = Boolean(
    publishCheckpoint?.status === 'completed' && publishCheckpoint?.human_approved === true,
  )
  const exportedEntry = publishLog?.entries?.find((entry) => entry.status === 'exported')
  const thumbnailPath = absoluteProjectPath(
    job.project_path,
    publishLog?.metadata?.thumbnail_path || renderReport?.metadata?.thumbnail_path || null,
  )
  const now = new Date().toISOString()

  const { error: jobError } = await control
    .from('commerce_creative_jobs')
    .update({
      status: humanApproved ? 'approved' : 'qa_review',
      approval_state: humanApproved ? 'assets_approved' : 'awaiting_asset_review',
      render_path: absoluteProjectPath(job.project_path, exportedEntry?.export_path) || renderPath,
      thumbnail_path: thumbnailPath,
      output_payload: {
        ...(job.output_payload || {}),
        checkpoint_summary: checkpointSummary,
        compose_checkpoint: composeCheckpoint,
        publish_checkpoint: publishCheckpoint,
        final_review: finalReview,
        render_report: renderReport,
        publish_log: publishLog,
      },
      last_error: null,
      completed_at: humanApproved ? now : null,
    })
    .eq('id', job.id)
  if (jobError) throw jobError

  const { error: productError } = await shop
    .from('products')
    .update({
      creative_status: humanApproved ? 'approved' : 'review',
      pipeline_state: humanApproved ? 'ready_to_publish' : 'creative_ready',
      updated_at: now,
    })
    .eq('id', job.product_id)
  if (productError) throw productError

  return {
    job_id: job.id,
    project_id: job.project_id,
    status: humanApproved ? 'approved' : 'qa_review',
    render_path: renderPath,
  }
}

async function syncExistingCreativeJobs() {
  const { data: jobs, error } = await control
    .from('commerce_creative_jobs')
    .select('id, product_id, project_id, project_path, status, output_payload')
    .in('status', ['brief_ready', 'awaiting_approval', 'generating', 'qa_review'])
    .order('updated_at', { ascending: true })
    .limit(100)
  if (error) throw error

  const synced = []
  for (const job of jobs || []) {
    let result = await syncCreativeJob(job)
    if (process.env.OPENMONTAGE_AGENT_COMMAND_JSON && job.status !== 'approved') {
      const briefPath = path.join(job.project_path, 'PROJECT_BRIEF.md')
      if (await fileExists(briefPath)) {
        const agent = await maybeLaunchAgent({
          projectId: job.project_id,
          projectPath: job.project_path,
          briefPath,
        })
        const { data: refreshed, error: refreshError } = await control
          .from('commerce_creative_jobs')
          .select('id, product_id, project_id, project_path, status, output_payload')
          .eq('id', job.id)
          .single()
        if (refreshError) throw refreshError
        await control
          .from('commerce_creative_jobs')
          .update({
            output_payload: {
              ...(refreshed.output_payload || {}),
              agent,
              agent_synced_at: new Date().toISOString(),
            },
          })
          .eq('id', job.id)
        result = await syncCreativeJob({
          ...refreshed,
          output_payload: {
            ...(refreshed.output_payload || {}),
            agent,
            agent_synced_at: new Date().toISOString(),
          },
        })
      }
    }
    if (result) synced.push(result)
  }
  return synced
}

async function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || ROOT,
      env: { ...process.env, ...(options.env || {}) },
      shell: false,
      stdio: options.inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    if (!options.inherit) {
      child.stdout.on('data', (chunk) => { stdout += chunk.toString() })
      child.stderr.on('data', (chunk) => { stderr += chunk.toString() })
    }
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve({ code, stdout, stderr })
      else reject(new Error(`${command} exited ${code}: ${stderr || stdout}`))
    })
  })
}

async function initializeProject(projectId, title) {
  const script = [
    'import os',
    'from lib.checkpoint import init_project',
    'init_project(os.environ["SHOP_PROJECT_ID"], title=os.environ["SHOP_PROJECT_TITLE"], pipeline_type="product-ugc")',
  ].join('; ')
  await run('python3', ['-c', script], {
    cwd: OPENMONTAGE_ROOT,
    env: { SHOP_PROJECT_ID: projectId, SHOP_PROJECT_TITLE: title },
  })
}

function buildBrief(product, projectId) {
  const enrichment = product.enrichment || {}
  const manufacturer = enrichment.manufacturer || {}
  const imagePrompts = enrichment.image_prompts || []
  const hooks = enrichment.ugc_hooks || []
  const sources = enrichment.source_urls || []

  return `# ShopSIN Product Creative Brief

## Project
- Project ID: ${projectId}
- Pipeline: product-ugc
- Product ID: ${product.product_id}
- CJ Product ID: ${product.cj_product_id}
- Target locale: de-DE
- Primary output: TikTok / Reels, 1080x1920, 9:16
- Secondary outputs: 1:1 product social, 4:5 feed, shop hero still
- Required state: awaiting human approval before paid generation and before publishing

## Product truth
**Title:** ${enrichment.title_de || product.title}

${enrichment.description_de || product.description_raw || ''}

### Selling points
${markdownList(enrichment.selling_points)}

### Specifications
${markdownList((enrichment.specifications || []).map((spec) => `${spec.name}: ${spec.value}${spec.source_url ? ` — ${spec.source_url}` : ''}`))}

### Safety and claim constraints
${markdownList(enrichment.safety_notes)}

### Claims that must not be used
${markdownList(enrichment.prohibited_claims)}

### Manufacturer verification
- Verified: ${Boolean(manufacturer.verified)}
- Name: ${manufacturer.name || 'unknown'}
- Source: ${manufacturer.source_url || 'none'}

## Approved source media
${markdownList(product.images)}

The exact product shape, controls, connectors, labels, colors and included accessories must remain faithful to these source images. Do not invent bundle contents or imply a feature that is not evidenced.

## Image directions
${markdownList(imagePrompts)}

Generate a cohesive pack only after proposal approval:
1. Clean commerce hero on neutral background.
2. Realistic in-context use image.
3. Detail/macroscopic feature image.
4. Scale/size context without misleading proportions.
5. UGC thumbnail frame with readable benefit-led overlay.

## UGC hooks
${markdownList(hooks)}

## Video contract
- 20–35 seconds, vertical 9:16.
- Hook in first 1.5 seconds.
- Product visible early and repeatedly.
- Demonstrate only evidenced uses.
- Natural German spoken copy; no fake testimonials or fabricated results.
- Clearly disclose realistic AI-generated people/scenes where platform rules require it.
- Use commercial disclosure for product promotion.
- Captions required and safe-area checked.
- CTA: visit ShopSIN product page; no fake urgency or scarcity.
- Final render is deliverable only when OpenMontage final_review.status == "pass".

## Research sources
${markdownList(sources)}

## Publishing blockers from commerce pipeline
${markdownList(product.publish_blockers, 'Keine zusätzlichen Datenblocker gemeldet')}

## Required workflow
1. Run OpenMontage preflight and provider menu.
2. Present Remotion and HyperFrames when both are available.
3. Produce differentiated concepts and itemized cost estimate.
4. Stop at proposal approval.
5. Stop again at script, scene-plan and asset approval gates.
6. Write all artifacts/checkpoints inside this project.
7. Never publish automatically from OpenMontage; hand approved outputs back to ShopSIN.
`
}

async function maybeLaunchAgent({ projectId, projectPath, briefPath }) {
  if (!process.env.OPENMONTAGE_AGENT_COMMAND_JSON) {
    return { launched: false, status: 'awaiting_agent', reason: 'OPENMONTAGE_AGENT_COMMAND_JSON not configured' }
  }

  let commandSpec
  try {
    commandSpec = JSON.parse(process.env.OPENMONTAGE_AGENT_COMMAND_JSON)
  } catch {
    throw new Error('OPENMONTAGE_AGENT_COMMAND_JSON must be a JSON array')
  }
  if (!Array.isArray(commandSpec) || commandSpec.length < 1) {
    throw new Error('OPENMONTAGE_AGENT_COMMAND_JSON must contain command and optional arguments')
  }

  const substitutions = {
    '{project_id}': projectId,
    '{project_path}': projectPath,
    '{brief_path}': briefPath,
    '{openmontage_root}': OPENMONTAGE_ROOT,
  }
  const expanded = commandSpec.map((part) => {
    let value = String(part)
    for (const [token, replacement] of Object.entries(substitutions)) {
      value = value.replaceAll(token, replacement)
    }
    return value
  })
  const [command, ...args] = expanded
  const result = await run(command, args, { cwd: OPENMONTAGE_ROOT, inherit: true })
  return { launched: true, status: 'agent_finished', exit_code: result.code }
}

async function prepareProject(product) {
  const { data: existingJob, error: existingError } = await control
    .from('commerce_creative_jobs')
    .select('id, project_id, project_path, status, approval_state, output_payload')
    .eq('product_id', product.product_id)
    .in('status', ['brief_ready', 'awaiting_approval', 'generating', 'qa_review', 'approved'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (existingError) throw existingError
  if (existingJob) {
    const briefPath = path.join(existingJob.project_path, 'PROJECT_BRIEF.md')
    let agent = { launched: false, status: 'not_resumed' }
    if (
      existingJob.status !== 'approved' &&
      existingJob.output_payload?.final_review?.status !== 'pass' &&
      process.env.OPENMONTAGE_AGENT_COMMAND_JSON
    ) {
      agent = await maybeLaunchAgent({
        projectId: existingJob.project_id,
        projectPath: existingJob.project_path,
        briefPath,
      })
    }
    const checkpointSummary = await collectCheckpointSummary(existingJob.project_path)
    await control
      .from('commerce_creative_jobs')
      .update({
        status: checkpointSummary.open_gate ? 'awaiting_approval' : existingJob.status,
        output_payload: {
          ...(existingJob.output_payload || {}),
          resumed_at: agent.launched ? new Date().toISOString() : null,
          agent,
          checkpoint_summary: checkpointSummary,
          checkpoint_synced_at: new Date().toISOString(),
        },
        last_error: null,
      })
      .eq('id', existingJob.id)
    return {
      product_id: product.product_id,
      creative_job_id: existingJob.id,
      project_id: existingJob.project_id,
      project_path: existingJob.project_path,
      brief_path: briefPath,
      reused: true,
      status: checkpointSummary.open_gate ? 'awaiting_approval' : existingJob.status,
      open_gate: checkpointSummary.open_gate?.stage || null,
      checkpoint_summary: checkpointSummary,
      agent,
    }
  }

  const baseTitle = product.enrichment?.short_title_de || product.enrichment?.title_de || product.title
  const projectId = `shopsin-${formatDate()}-${slugify(baseTitle)}-${String(product.cj_product_id).slice(-6).toLowerCase()}`
  const projectPath = path.join(OPENMONTAGE_ROOT, 'projects', projectId)
  const artifactsPath = path.join(projectPath, 'artifacts')
  const briefPath = path.join(projectPath, 'PROJECT_BRIEF.md')

  if (!(await fileExists(path.join(OPENMONTAGE_ROOT, 'AGENT_GUIDE.md')))) {
    throw new Error(`OpenMontage root is invalid: ${OPENMONTAGE_ROOT}`)
  }
  if (!(await fileExists(path.join(OPENMONTAGE_ROOT, 'pipeline_defs', 'product-ugc.yaml')))) {
    throw new Error('OpenMontage product-ugc pipeline is missing')
  }

  if (!(await fileExists(path.join(projectPath, 'project.json')))) {
    await initializeProject(projectId, baseTitle)
  }
  await fs.mkdir(artifactsPath, { recursive: true })
  await fs.writeFile(
    path.join(artifactsPath, 'commerce_intake.json'),
    `${JSON.stringify({
      schema_version: 1,
      received_at: new Date().toISOString(),
      source_system: 'shopsin-commerce-control-plane',
      pipeline_run_id: PIPELINE_RUN_ID,
      product,
    }, null, 2)}\n`,
  )
  await fs.writeFile(briefPath, buildBrief(product, projectId))
  await fs.writeFile(
    path.join(projectPath, 'agent_request.json'),
    `${JSON.stringify({
      pipeline: 'product-ugc',
      project_id: projectId,
      brief_path: briefPath,
      status: 'awaiting_agent',
      required_first_action: 'Read AGENT_GUIDE.md, pipeline_defs/product-ugc.yaml and PROJECT_BRIEF.md; run preflight; stop at proposal approval.',
      created_at: new Date().toISOString(),
    }, null, 2)}\n`,
  )

  const { data: creativeJob, error: creativeError } = await control
    .from('commerce_creative_jobs')
    .upsert({
      product_id: product.product_id,
      pipeline_run_id: PIPELINE_RUN_ID,
      project_id: projectId,
      project_path: projectPath,
      pipeline_type: 'product-ugc',
      aspect_ratio: '9:16',
      status: 'brief_ready',
      approval_state: 'awaiting_brief_review',
      input_payload: {
        product_title: baseTitle,
        source_images: product.images || [],
        image_prompts: product.enrichment?.image_prompts || [],
        ugc_hooks: product.enrichment?.ugc_hooks || [],
        source_urls: product.enrichment?.source_urls || [],
      },
    }, { onConflict: 'product_id,project_id' })
    .select('id')
    .single()
  if (creativeError) throw creativeError

  const { error: productError } = await shop
    .from('products')
    .update({
      pipeline_state: 'creative_queued',
      creative_status: 'queued',
      updated_at: new Date().toISOString(),
    })
    .eq('id', product.product_id)
  if (productError) throw productError

  let agent
  let checkpointSummary = { checkpoints: [], open_gate: null, latest_stage: null }
  try {
    agent = await maybeLaunchAgent({ projectId, projectPath, briefPath })
    checkpointSummary = await collectCheckpointSummary(projectPath)
    await control
      .from('commerce_creative_jobs')
      .update({
        status: checkpointSummary.open_gate ? 'awaiting_approval' : 'brief_ready',
        output_payload: {
          agent,
          checkpoint_summary: checkpointSummary,
          checkpoint_synced_at: new Date().toISOString(),
        },
      })
      .eq('id', creativeJob.id)
  } catch (error) {
    await control
      .from('commerce_creative_jobs')
      .update({ status: 'failed', last_error: error.message })
      .eq('id', creativeJob.id)
    throw error
  }

  return {
    product_id: product.product_id,
    creative_job_id: creativeJob.id,
    project_id: projectId,
    project_path: projectPath,
    brief_path: briefPath,
    open_gate: checkpointSummary.open_gate?.stage || null,
    checkpoint_summary: checkpointSummary,
    agent,
  }
}

async function main() {
  const synced = await syncExistingCreativeJobs()
  const input = await readJsonMaybe(INPUT_FILE)
  const products = (input?.products || [])
    .filter((product) => product.status !== 'failed' && product.product_id)
    .slice(0, MAX_PRODUCTS)
  if (!products.length && !synced.length) {
    throw new Error('No enriched products or existing OpenMontage results are available')
  }

  const handoffs = []
  const failures = []
  for (const product of products) {
    try {
      const handoff = await prepareProject(product)
      handoffs.push(handoff)
      console.log(`Prepared ${handoff.project_id}`)
    } catch (error) {
      failures.push({ product_id: product.product_id, error: error.message })
      console.error(`Creative handoff failed for ${product.product_id}: ${error.message}`)
    }
  }

  const report = {
    generated_at: new Date().toISOString(),
    openmontage_root: OPENMONTAGE_ROOT,
    prepared: handoffs.length,
    synced: synced.length,
    failed: failures.length,
    handoffs,
    synced_jobs: synced,
    failures,
  }
  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true })
  await fs.writeFile(OUTPUT_FILE, `${JSON.stringify(report, null, 2)}\n`)
  if (!handoffs.length && !synced.length) throw new Error('No OpenMontage handoff could be prepared or synced')
  console.log(`Creative handoff report: ${OUTPUT_FILE}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
