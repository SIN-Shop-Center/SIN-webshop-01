#!/usr/bin/env node
/** Apply pending Admin approvals to local OpenMontage checkpoint files. */
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { createClient } from '@supabase/supabase-js'
import { loadLocalEnvFiles } from '../lib/cli-env.mjs'

loadLocalEnvFiles()

function argument(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : null
}

const projectId = argument('--project-id')
if (!projectId) throw new Error('--project-id is required')

const root = path.resolve(process.env.OPENMONTAGE_ROOT || '/Users/jeremy/dev/OpenMontage')
const projectPath = path.join(root, 'projects', projectId)
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Supabase service-role configuration is required')

const control = createClient(url, key, {
  auth: { persistSession: false },
  db: { schema: 'public' },
})

async function atomicWriteJson(filePath, payload) {
  const historyPath = path.join(path.dirname(filePath), 'history')
  await fs.mkdir(historyPath, { recursive: true })
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '')
  await fs.copyFile(filePath, path.join(historyPath, `${path.basename(filePath, '.json')}_${timestamp}_control-plane.json`))
  const tempPath = `${filePath}.control-plane.tmp`
  await fs.writeFile(tempPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  await fs.rename(tempPath, filePath)
}

async function main() {
  const rootReal = await fs.realpath(root)
  const projectReal = await fs.realpath(projectPath)
  if (!projectReal.startsWith(`${rootReal}${path.sep}projects${path.sep}`)) {
    throw new Error('Project path escaped OpenMontage root')
  }

  const { data: job, error: jobError } = await control
    .from('commerce_creative_jobs')
    .select('id, project_id, status, output_payload')
    .eq('project_id', projectId)
    .maybeSingle()
  if (jobError) throw jobError
  if (!job) {
    console.log(JSON.stringify({ project_id: projectId, applied: 0, reason: 'No creative job found' }))
    return
  }

  const { data: approvals, error: approvalError } = await control
    .from('commerce_creative_approvals')
    .select('id, stage, decision, feedback, decided_at, status')
    .eq('creative_job_id', job.id)
    .eq('status', 'pending')
    .order('decided_at', { ascending: true })
  if (approvalError) throw approvalError

  const applied = []
  const failed = []
  for (const approval of approvals || []) {
    const checkpointPath = path.join(projectReal, `checkpoint_${approval.stage}.json`)
    try {
      const checkpoint = JSON.parse(await fs.readFile(checkpointPath, 'utf8'))
      if (checkpoint.project_id !== projectId || checkpoint.stage !== approval.stage) {
        throw new Error('Checkpoint identity mismatch')
      }
      if (checkpoint.status !== 'awaiting_human') {
        throw new Error(`Checkpoint is ${checkpoint.status}, not awaiting_human`)
      }

      checkpoint.human_approved = approval.decision === 'approved'
      checkpoint.timestamp = new Date().toISOString()
      checkpoint.metadata = {
        ...(checkpoint.metadata || {}),
        commerce_control_plane_approval: {
          approval_id: approval.id,
          decision: approval.decision,
          feedback: approval.feedback || null,
          decided_at: approval.decided_at,
          applied_at: new Date().toISOString(),
        },
      }
      await atomicWriteJson(checkpointPath, checkpoint)

      const { error: updateError } = await control
        .from('commerce_creative_approvals')
        .update({ status: 'applied', applied_at: new Date().toISOString(), last_error: null })
        .eq('id', approval.id)
      if (updateError) throw updateError
      applied.push({ stage: approval.stage, decision: approval.decision })
    } catch (error) {
      await control
        .from('commerce_creative_approvals')
        .update({ status: 'failed', last_error: error.message })
        .eq('id', approval.id)
      failed.push({ stage: approval.stage, error: error.message })
    }
  }

  if (applied.length) {
    await control
      .from('commerce_creative_jobs')
      .update({
        status: 'awaiting_approval',
        output_payload: {
          ...(job.output_payload || {}),
          last_control_plane_approvals: applied,
          approvals_applied_at: new Date().toISOString(),
        },
        last_error: null,
      })
      .eq('id', job.id)
  }

  console.log(JSON.stringify({ project_id: projectId, applied, failed }, null, 2))
  if (failed.length) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
