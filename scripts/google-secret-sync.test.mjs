import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'

const execFileAsync = promisify(execFile)
const cwd = process.cwd()

test('Cloudflare Google sync dry-run reports missing key without failing', async () => {
  const scriptPath = path.join(cwd, 'scripts', 'push-cloudflare-key-to-google.mjs')
  const fakeHome = await fs.mkdtemp(path.join(os.tmpdir(), 'cf-google-dry-run-'))
  const env = {
    ...process.env,
    HOME: fakeHome,
    CLOUDFLARE_API_KEY: '',
    GOOGLE_SERVICE_ACCOUNT_JSON_B64: '',
    GOOGLE_SERVICE_ACCOUNT_FILE: '',
    GOOGLE_CLOUD_PROJECT: '',
    GOOGLE_CLOUD_PROJECT_ID: '',
  }

  const { stdout } = await execFileAsync('node', [scriptPath, '--dry-run'], {
    cwd,
    env,
    maxBuffer: 10 * 1024 * 1024,
  })

  const payload = JSON.parse(stdout)
  assert.equal(payload.mode, 'secret-manager')
  assert.equal(payload.cloudflare_key_present, false)
  assert.equal(payload.google_service_account_present, false)
})
