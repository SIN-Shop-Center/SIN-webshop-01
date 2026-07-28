#!/usr/bin/env node

import path from 'node:path'
import process from 'node:process'
import {
  hasGoogleServiceAccount as hasGoogleServiceAccountShared,
  loadGoogleServiceAccount as loadGoogleServiceAccountShared,
  requestGoogleAccessToken as requestGoogleAccessTokenShared,
} from './lib/google-api.mjs'
import { hasFlag, loadEnvFile, loadLocalEnvFiles, readArgValue } from './lib/cli-env.mjs'

const SECRET_MANAGER_SCOPE = 'https://www.googleapis.com/auth/cloud-platform'
const STORAGE_SCOPE = 'https://www.googleapis.com/auth/devstorage.read_write'

async function main() {
  loadLocalEnvFiles()
  const sourceEnv = readArgValue('--source-env') || process.env.CLOUDFLARE_API_KEY_SOURCE_ENV || ''
  if (sourceEnv) {
    loadEnvFile(path.resolve(sourceEnv), true)
  }

  const mode = normalizeMode(readArgValue('--mode') || process.env.GOOGLE_SECRET_SYNC_MODE || 'secret-manager')
  const dryRun = hasFlag('--dry-run')
  const cloudflareKey = String(process.env.CLOUDFLARE_API_KEY || '').trim()

  if (dryRun) {
    process.stdout.write(JSON.stringify(buildDryRunPayload(mode), null, 2) + '\n')
    return
  }

  if (!cloudflareKey) {
    throw new Error('cloudflare_api_key_missing')
  }

  const serviceAccount = loadGoogleServiceAccountShared({
    filePath: process.env.GOOGLE_SERVICE_ACCOUNT_FILE,
  })
  const projectId =
    String(readArgValue('--project') || process.env.GOOGLE_CLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT_ID || serviceAccount.projectId || '')
      .trim()
  if (!projectId) {
    throw new Error('google_project_missing')
  }

  if (mode === 'secret-manager') {
    const secretName = String(readArgValue('--secret-name') || process.env.CLOUDFLARE_API_KEY_SECRET_NAME || 'cloudflare-api-key').trim()
    if (!secretName) {
      throw new Error('secret_manager_secret_name_missing')
    }
    const accessToken = await requestGoogleAccessTokenShared({ serviceAccount, scopes: [SECRET_MANAGER_SCOPE] })
    await ensureSecretExists({ accessToken, projectId, secretName })
    const versionName = await addSecretVersion({ accessToken, projectId, secretName, secretValue: cloudflareKey })
    process.stdout.write(`OK: stored Cloudflare key in Secret Manager as ${versionName}\n`)
    return
  }

  const bucket = String(readArgValue('--bucket') || process.env.GCS_SECRET_BUCKET || '').trim()
  if (!bucket) {
    throw new Error('gcs_bucket_missing')
  }
  const objectName = String(readArgValue('--object') || process.env.CLOUDFLARE_API_KEY_GCS_OBJECT || 'secrets/cloudflare-api-key.txt').trim()
  if (!objectName) {
    throw new Error('gcs_object_missing')
  }
  const accessToken = await requestGoogleAccessTokenShared({ serviceAccount, scopes: [STORAGE_SCOPE] })
  const objectResult = await uploadObject({ accessToken, bucket, objectName, body: cloudflareKey })
  process.stdout.write(`OK: stored Cloudflare key in gs://${bucket}/${objectResult.name}\n`)
}

function normalizeMode(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'gcs') {
    return 'gcs'
  }
  return 'secret-manager'
}

function buildDryRunPayload(mode) {
  const projectId = String(readArgValue('--project') || process.env.GOOGLE_CLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT_ID || '').trim()
  if (mode === 'gcs') {
    return {
      mode,
      project_id: projectId,
      bucket: String(process.env.GCS_SECRET_BUCKET || '').trim(),
      object: String(process.env.CLOUDFLARE_API_KEY_GCS_OBJECT || 'secrets/cloudflare-api-key.txt').trim(),
      cloudflare_key_present: Boolean(String(process.env.CLOUDFLARE_API_KEY || '').trim()),
      google_service_account_present: hasGoogleServiceAccountShared({
        filePath: process.env.GOOGLE_SERVICE_ACCOUNT_FILE,
      }),
    }
  }
  return {
    mode,
    project_id: projectId,
    secret_name: String(process.env.CLOUDFLARE_API_KEY_SECRET_NAME || 'cloudflare-api-key').trim(),
    cloudflare_key_present: Boolean(String(process.env.CLOUDFLARE_API_KEY || '').trim()),
    google_service_account_present: hasGoogleServiceAccountShared({
      filePath: process.env.GOOGLE_SERVICE_ACCOUNT_FILE,
    }),
  }
}

async function ensureSecretExists({ accessToken, projectId, secretName }) {
  const base = `https://secretmanager.googleapis.com/v1/projects/${encodeURIComponent(projectId)}`
  const secretPath = `${base}/secrets/${encodeURIComponent(secretName)}`
  const existing = await fetch(secretPath, {
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: 'application/json',
    },
  })
  if (existing.ok) {
    return
  }
  if (existing.status !== 404) {
    const payload = await existing.json().catch(() => ({}))
    throw new Error(String(payload?.error?.message || `secret_manager_lookup_failed:${existing.status}`).trim())
  }

  const create = await fetch(`${base}/secrets?secretId=${encodeURIComponent(secretName)}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      replication: {
        automatic: {},
      },
    }),
  })
  const payload = await create.json().catch(() => ({}))
  if (!create.ok) {
    throw new Error(String(payload?.error?.message || `secret_manager_create_failed:${create.status}`).trim())
  }
}

async function addSecretVersion({ accessToken, projectId, secretName, secretValue }) {
  const response = await fetch(
    `https://secretmanager.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/secrets/${encodeURIComponent(secretName)}:addVersion`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        payload: {
          data: Buffer.from(secretValue, 'utf8').toString('base64'),
        },
      }),
    },
  )
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(String(payload?.error?.message || `secret_manager_add_version_failed:${response.status}`).trim())
  }
  return String(payload.name || '').trim() || `projects/${projectId}/secrets/${secretName}/versions/latest`
}

async function uploadObject({ accessToken, bucket, objectName, body }) {
  const response = await fetch(
    `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?uploadType=media&name=${encodeURIComponent(objectName)}`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/octet-stream',
        'cache-control': 'private, no-store',
        accept: 'application/json',
      },
      body,
    },
  )
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(String(payload?.error?.message || `gcs_upload_failed:${response.status}`).trim())
  }
  return {
    bucket: String(payload.bucket || bucket).trim(),
    name: String(payload.name || objectName).trim(),
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`${message}\n`)
  process.exit(1)
})
