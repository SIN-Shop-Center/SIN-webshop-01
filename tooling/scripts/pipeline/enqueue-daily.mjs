#!/usr/bin/env node
/** Enqueue one idempotent commerce pipeline run for the local calendar day. */
import process from 'node:process'
import { createClient } from '@supabase/supabase-js'
import { loadLocalEnvFiles } from '../lib/cli-env.mjs'

loadLocalEnvFiles()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Supabase service-role configuration is required')

const control = createClient(url, key, {
  auth: { persistSession: false },
  db: { schema: 'public' },
})

function berlinDateKey(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(date)
}

const dateKey = berlinDateKey()
const { data, error } = await control
  .from('queue_jobs')
  .upsert({
    queue_name: 'commerce-autopilot',
    job_type: 'pipeline.daily',
    dedupe_key: `pipeline.daily:${dateKey}`,
    payload: {
      requested_at: new Date().toISOString(),
      requested_from: 'launchd-daily-schedule',
      local_date: dateKey,
      timezone: 'Europe/Berlin',
      approval_mode: 'policy_gated',
    },
    status: 'pending',
    max_attempts: 3,
    available_at: new Date().toISOString(),
  }, {
    onConflict: 'queue_name,dedupe_key',
    ignoreDuplicates: true,
  })
  .select('id, status, created_at')
  .maybeSingle()

if (error) throw error
console.log(data ? `Enqueued daily pipeline ${data.id}` : `Daily pipeline ${dateKey} already exists`)
